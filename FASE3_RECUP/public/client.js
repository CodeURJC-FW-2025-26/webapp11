// ===================== STATE VARIABLES =====================
let page = 1;
let loading = false;
let hasMore = true;

// ===================== INITIALIZATION =====================
document.addEventListener("DOMContentLoaded", () => {

    // 1. Highlight active country button
    highlightActiveCountry();

    // 1. Configure Infinite Scroll
    window.addEventListener('scroll', handleScroll);
});

// ===================== FILTER BUTTONS LOGIC (NEW) =====================

function highlightActiveCountry() {
    // 1. Get current country from URL
    const params = new URLSearchParams(window.location.search);
    const currentCountry = params.get('country') || "";

    // 2. Select all buttons with data-country attribute
    const buttons = document.querySelectorAll('.filter-buttons a[data-country]');

    // 3. Iterate and highlight
    buttons.forEach(btn => {
        const countryAttr = btn.getAttribute('data-country');

        // Check if this button's country matches the current country
        const isActive = countryAttr.toLowerCase() === currentCountry.toLowerCase();

        // Toggle classes based on active state
        btn.classList.toggle('btn-dark', isActive);        // if active -> solid
        btn.classList.toggle('btn-outline-dark', !isActive); // if not active -> outline
    });
}

// ===================== INFINITE SCROLL =====================

function handleScroll() {
    //if already loading, do nothing
    if (loading) return;

    const bottomSpinner = document.getElementById('infinite-scroll-spinner');

    // Detect end of page
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 50) {
        // ONLY try to load if there is more content.
        // If hasMore is false (we reached the finish line), we do nothing.
        if (hasMore) { // If there are more pages to load 
            loadNextPage();
        }
    }
}

// Load next page of data
async function loadNextPage() {
    loading = true;

    const bottomSpinner = document.getElementById('infinite-scroll-spinner');
    const finishMsg = document.getElementById('finish-line-msg');
    const container = document.getElementById('brands-container');

    // UI: Show spinner, hide finish line (just in case)
    if (bottomSpinner) bottomSpinner.classList.remove('d-none');
    if (finishMsg) finishMsg.classList.add('d-none');

    const params = new URLSearchParams(window.location.search);
    const search = params.get('search') || '';
    const country = params.get('country') || '';

    page++;

    // Since router.js already has "await setTimeout", this line will delay 800ms-

    // 1. Start the data request. 
    // Using 'await' here means execution stops if there is a network error (console error).
    const response = await fetch(`/?page=${page}&search=${search}&country=${country}&format=json`);

    // 2. Convert to JSON
    const data = await response.json();



    // --- RENDER ---
    if (data.brands && data.brands.length > 0) {
        renderNewBrands(data.brands);
    }

    // Update state
    hasMore = data.hasMore;

    // --- END MANAGEMENT ---
    if (!hasMore) {
        // Show the finish line flag
        if (finishMsg) finishMsg.classList.remove('d-none');

        // Hide the spinner temporarily
        if (bottomSpinner) bottomSpinner.classList.add('d-none');
    }

    // --- CLEANUP (What 'finally' used to do) ---
    // This executes only if everything above went well
    loading = false;

    // If there is still more data, hide the spinner for the next time
    if (hasMore && bottomSpinner) {
        bottomSpinner.classList.add('d-none');
    }
}

function renderNewBrands(brands) {
    const container = document.getElementById('brands-container');

    brands.forEach(brand => {
        const cardHTML = `
            <div class="col-md-4 col-sm-6 mb-4 fade-in-card">
                <a href="/brand/${brand._id}" class="brand-card">
                    <img src="/brand/${brand._id}/image" alt="${brand.brandName}">
                    <span>${brand.brandName}</span>
                </a>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHTML);
    });
}
// ===================== MODAL CODE =====================
// Wait for DOM to load before setting up buttons to load modals
document.addEventListener("DOMContentLoaded", () => {
    let dialog = loadDialogWindow();
    let brandid = obtainBrandID();
    let modelName = null;
    loadDropZoneHandler();

    // Checker for whenever something is clicked. Used to detect which buttons are pressed.
    document.addEventListener("click", async (event) => {
        let targetButton = event.target;
        // Button pressed is any of the model deletion buttons
        if (targetButton.classList.contains("deleteModelButton")) {
            let modelName = obtainModelName(targetButton);
            let response = await deleteModel(modelName, brandid);
            if (response.status === 200) {
                document.getElementById(modelName).remove();
            }
            else {
                showErrorWindow(dialog, response);
            }
        }
        // Button pressed is the brand deletion button
        else if (targetButton.id === "brandDeletionButton") {
            confirmBrandDeletion(dialog, brandid);
        }
        // Button pressed is a model edition button
        else if (targetButton.classList.contains("editModelButton")) {
            modelName = obtainModelName(targetButton);

            let result = await fetch(`/brand/${brandid}/model/${modelName}`);
            let modelInfo = await result.json();
            let model = modelInfo.models[0];

            if (modelName) {
                loadFormInfo(model, brandid);
                hideShowInfoPage();
            }
        }
        // Button pressed is a model edition cancel button
        else if (targetButton.classList.contains("cancelEditModel")) {
            wipeFormInfo();
            hideShowInfoPage();
        }
    })

    const createForm = document.getElementById("createForm");

    createForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (e.submitter.classList.contains("confirmEdit")) {
            // Obtain form data
            const formData = new FormData(createForm);

            // No image sent by the user
            if (!formData.get("image").size) {

                // In the code, having the remove image button show up means there is an image already,
                // even if the user has not uploaded anything.
                const removeImageButton = document.getElementById("removeImageButton");
                const previousImageExists = !removeImageButton?.classList.contains("d-none");

                // In case there is no previous image, upload the default image. If any image exists, this code won't
                // execute, keeping the last image uploaded to the server.
                if (!previousImageExists) {

                    const file = await loadDefaultImage();

                    // Add the image to the form before sending it.
                    formData.append("image", file);
                }

            }

            try {

                const response = await fetch(`/brand/${brandid}/model/${modelName}/edit`, {
                    method: "POST",
                    body: formData
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || "Error updating data");
                }

                const result = await response.json();
                updateCarCard(result, modelName);
                hideShowInfoPage();
                wipeFormInfo();

            } catch (error) {
            }
        }

        else if (e.submitter.id === "createButton") {
            const formData = new FormData(createForm);

            // If no image sent, load default image as placeholder in the form
            if (!formData.get("image").size) {
                const file = await loadDefaultImage();
                formData.append("image", file);
            }

            // Logic for sending out the form
            try {
                const response = await fetch(`/brand/${brandid}/model/create`, {
                    method: "POST",
                    body: formData
                });

                const result = await response.json();
                createCarCard(result);
                wipeFormInfo();

            } catch (error) {
                showFixError(dialog);
            }
        }

    });

});

async function loadDefaultImage() {
    const response = await fetch('/default_car.jpg');

    if (!response.ok) {
        throw new Error("Error fetching image");
    }

    // Create image and upload it masked as a File uploaded by the user.
    const blob = await response.blob();
    const file = new File(
        [blob],
        "model-image.jpg",
        { type: blob.type }
    );

    return file;
}

function wipeFormInfo() {
    const form = document.getElementById("createForm");
    form.reset();
    document.getElementById("technical_specifications").innerText = '';
    document.getElementById("rental_conditions").innerText = '';
    document.getElementById("interesting_facts").innerText = '';
    document.getElementById("imgPreviewField").innerHTML = '';
}

async function updateCarCard(car, modelName) {
    // Obtain previous model card
    const card = document.getElementById(modelName);
    card.id = car.name;
    card.dataset.modelname = car.name;
    let brandid = obtainBrandID();

    const response = await fetch(`/brand/${brandid}/model/${encodeURIComponent(car.name)}/image`);
    const blob = await response.blob();

    const blobUrl = URL.createObjectURL(blob);

    // Fill content in the card
    card.innerHTML = `
        <div class="mt-3">
            <img src="${blobUrl}" alt="${car.name}">
            <br>
            <span class="car-name">${car.name}</span>
            <span class="car-details">${car.year} • ${car.HP} HP</span>
            <span class="car-price">${car.daily_price}$/day</span>
            <p class="mt-2" style="font-size:0.9rem; color:#555;">
                <strong>Technical Specifications:</strong> ${car.technical_specifications}
            </p>
            <p style="font-size:0.9rem; color:#555;">
                <strong>Rental Conditions:</strong> ${car.rental_conditions}
            </p>
            <p style="font-size:0.9rem; color:#555;">
                <strong>Interesting Facts:</strong> ${car.interesting_facts}
            </p>
            <div class="button-group mb-4">
                <a class="btn btn-sm btn-outline-primary editModelButton">Edit</a>
                <a class="btn btn-sm btn-outline-danger deleteModelButton" data-modelname="${car.name}">Delete</a>
            </div>
        </div>
    `;
}

function createCarCard(car) {
    // Create card for model 
    const card = document.createElement("div");
    card.className = "brand-card";
    card.id = car.name;
    card.dataset.modelname = car.name;
    let brandid = obtainBrandID();

    // Fill content in the card
    card.innerHTML = `
        <div class="mt-3">
            <img src="/brand/${brandid}/model/${car.name}/image" alt="${car.name}">
            <br>
            <span class="car-name">${car.name}</span>
            <span class="car-details">${car.year} • ${car.HP} HP</span>
            <span class="car-price">${car.daily_price}$/day</span>
            <p class="mt-2" style="font-size:0.9rem; color:#555;">
                <strong>Technical Specifications:</strong> ${car.technical_specifications}
            </p>
            <p style="font-size:0.9rem; color:#555;">
                <strong>Rental Conditions:</strong> ${car.rental_conditions}
            </p>
            <p style="font-size:0.9rem; color:#555;">
                <strong>Interesting Facts:</strong> ${car.interesting_facts}
            </p>
            <div class="button-group mb-4">
                <a class="btn btn-sm btn-outline-primary editModelButton">Edit</a>
                <a class="btn btn-sm btn-outline-danger deleteModelButton" data-modelname="${car.name}">Delete</a>
            </div>
        </div>
    `;

    // Inserting after all of the other model cards
    const container = document.getElementById("brandModelSection");
    container.appendChild(card);
}


// Loading form info into the form.
async function loadFormInfo(model, brandid) {
    document.getElementById("model").value = model.name;
    document.getElementById("HP").value = model.HP;
    document.getElementById("year").value = model.year;
    document.getElementById("daily_price").value = model.daily_price;
    document.getElementById("technical_specifications").innerText = model.technical_specifications;
    document.getElementById("rental_conditions").innerText = model.rental_conditions;
    document.getElementById("interesting_facts").innerText = model.interesting_facts;
    document.getElementById("imgPreviewField").innerHTML = `<img src="/brand/${brandid}/model/${model.name}/image"/>`

    loadRemoveButton();

}

function loadRemoveButton() {
    const removeBtn = document.getElementById("removeImageButton");
    const fileInput = document.getElementById("imageInputField");
    const previewField = document.getElementById("imgPreviewField");

    // Show
    if (removeBtn.classList.contains("d-none")) {
        removeBtn.classList.toggle("d-none");
    }

    // Hide on click
    removeBtn.addEventListener("click", () => {
        // 1. Clean preview
        previewField.innerHTML = "";

        // 2. Clean input
        fileInput.value = "";
        removeBtn.classList.add("d-none");
    });
}

// Function for handling the drag&drop area.
function loadDropZoneHandler() {
    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("imageInputField");
    const previewField = document.getElementById("imgPreviewField");

    // Opening file explorer when clicking the drop zone
    dropZone.addEventListener("click", () => fileInput.click());

    // Visuals for dragging over and away from the drop zone
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });

    // Handler for dropping a file
    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");

        const file = e.dataTransfer.files[0];
        // File successfully transferred
        if (file) {
            fileInput.files = e.dataTransfer.files;
            showPreview(file);
        }
    });

    // Manual selection of the file (File explorer)
    fileInput.addEventListener("change", () => {
        if (fileInput.files.length) {
            showPreview(fileInput.files[0]);
        }
    });

    // Preview
    function showPreview(file) {
        if (!file.type.startsWith("image/")) {
            alert("Only images allowed");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            previewField.innerHTML = `
            <img src="${reader.result}">
        `;
        };
        loadRemoveButton();

        reader.readAsDataURL(file);
    }
}

// Function to hide all of the info page and show the model edition form, or viceversa.
function hideShowInfoPage() {
    [
        "brandField",
        "brandModelSection",
        "editButtonGroup",
        "createButton"
    ].forEach(id => {
        document.getElementById(id)?.classList.toggle("d-none");
    });
}

// ===================== FORM SPINNER SETUP =====================
function setupFormSpinner(formSelector, spinnerId, redirectUrl = null, spinnerDuration = 1000) {
    const form = document.querySelector(formSelector);
    const spinner = document.getElementById(spinnerId);
    if (!form || !spinner) return;

    const saveButton = form.querySelector("button[type='submit']");
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const invalidFields = document.querySelectorAll(".is-invalid");
        const noInvalidFieldsPresent = invalidFields?.length === 0;
        const dialog = loadDialogWindow();
        if (noInvalidFieldsPresent) {
            spinner.classList.remove("d-none");
            saveButton.disabled = true;
            document.body.style.overflow = "hidden";
        }
        else {
            showFixError(dialog, [...invalidFields]);
        }



        setTimeout(() => {
            if (redirectUrl) {
                window.location.href = redirectUrl;
            } else {
                if (saveButton.classList.contains("newBrandButton") || saveButton.classList.contains("editBrandButton")) {
                    if (noInvalidFieldsPresent)
                        form.submit();
                    else {
                        spinner.classList.add("d-none");
                        saveButton.disabled = false;
                        document.body.style.overflow = "";
                    }
                }
                else {
                    spinner.classList.add("d-none");
                    saveButton.disabled = false;
                    document.body.style.overflow = "";
                    if (noInvalidFieldsPresent)
                        window.scrollTo(0, 0);
                }

            }
        }, spinnerDuration);
    });
}

// ===================== DOM CONTENT LOADED =====================
document.addEventListener("DOMContentLoaded", () => {

    // ---------------- Brand Form ----------------
    setupFormSpinner("#brandForm", "form-spinner");

    // ---------------- Model Form ----------------
    setupFormSpinner("#createForm", "model-spinner");
});

// AJAX function to delete a model from the page. Also removes the HTML model card that contains it in real time
async function deleteModel(modelName, brandId) {
    let response = await fetch(`/brand/${brandId}/model/${modelName}/delete`);
    return response;
}

// Function to obtain the ID from the brand.
function obtainBrandID() {
    return document.getElementById("brandField").getAttribute("data-brandid");
}

// Function to obtain the name of the model from the button we press.
function obtainModelName(target) {
    return target.closest('.brand-card').getAttribute("data-modelname");
}

function confirmBrandDeletion(dialog, brandid) {
    brandConfirmationWindow(dialog);

    if (dialog.confirmButton) {
        // Deletion of brand
        confirmButton.addEventListener("click", async () => {
            let response = await fetch(`/brand/${brandid}/delete`);
            // When successful, user is sent back to main page
            if (response.status === 200) {
                window.location.href = "/";
            }
            // When failed, a pop-up is shown with the error code
            else {
                showErrorWindow(dialog, response);
            }
        });
    }
}

function loadDialogWindow() {
    // Search of elements of the respective dialog (If the dialog pop-up itself does not exist, exit)
    let dialogWindow = document.getElementById("dialogModal");
    if (!dialogWindow) return;
    let result = {
        window: dialogWindow,
        confirmButton: document.getElementById("confirmButton"),
        cancelButton: document.getElementById("cancelButton"),
        headtext: document.getElementById("dialogHeader"),
        bodytext: document.getElementById("dialogBody"),
        subtext: document.getElementById("dialogIndicator")
    }

    // The cancel button will always close the window by default.
    result.cancelButton.addEventListener("click", () => {
        result.window.close();
    });

    return result;
}

function showErrorWindow(dialog, response) {
    dialog.window.close();
    dialog.headtext.innerText = "Something went wrong!";
    dialog.bodytext.innerText = "Please, try again.";
    dialog.subtext.style.display = "block";
    dialog.subtext.innerText = `ERROR CODE: ${response.status} - ${response.statusText}`;
    dialog.confirmButton.style.display = "none";
    dialog.cancelButton.innerText = "Close";
    dialog.window.showModal();
}

function brandConfirmationWindow(dialog) {
    // Set-up of dialog text
    dialog.headtext.innerText = "Are you sure?";
    dialog.bodytext.innerText = "Do you really want to delete this brand? This action cannot be undone.";
    dialog.subtext.style.display = "none";
    dialog.confirmButton.style.display = "block";
    dialog.confirmButton.innerText = "Yes, delete";
    dialog.cancelButton.style.display = "block";
    dialog.cancelButton.innerText = "Cancel";

    // Display of the pop-up dialog
    dialog.window.showModal();
}

function showFixError(dialog, invalidFields) {
    dialog.headtext.innerText = "Something went wrong."
    dialog.bodytext.innerText = "Please, fix all errors before validating."
    dialog.subtext.style.display = "block"
    const invalid = invalidFields.map(el => el.name);
    dialog.subtext.innerText = invalidFields ? `Current invalid fields: ${invalid}` : "";
    dialog.confirmButton.style.display = "none";
    dialog.cancelButton.style.display = "block";
    dialog.cancelButton.innerText = "Okay";

    dialog.window.showModal();
}

// ===================== BRAND INFO VALIDATION =====================

// ===================== HELPER FUNCTION =====================
function showValidationMessage(input, messageElement, text, isValid) {
    if (isValid) {
        input.classList.remove("is-invalid");
        input.classList.add("is-valid");
        messageElement.textContent = text;
        messageElement.style.color = "green";
    } else {
        input.classList.remove("is-valid");
        input.classList.add("is-invalid");
        messageElement.textContent = text;
        messageElement.style.color = "red";
    }
}

// ===================== BRAND NAME =====================

// Real-time validation of brand name with AJAX check
async function checkBrandName() {
    const input = document.getElementById("brand");
    const message = document.getElementById("brandMessage");
    const value = input.value.trim();

    if (!value) {
        input.classList.remove("is-valid", "is-invalid");
        message.textContent = "";
        return;
    }

    // Local syntax validation
    const syntaxValid = /^[A-ZÁÉÍÓÚÑ][a-zA-Z0-9\sáéíóúñÁÉÍÓÚÑ-]{0,29}$/.test(value);
    if (!syntaxValid) {
        showValidationMessage(input, message, "Brand must start with uppercase and be max 30 characters", false);
        return;
    }
    // Availability check via AJAX
    try {
        const response = await fetch(`/brand/check-name?brandName=${encodeURIComponent(value)}`);
        const data = await response.json();
        if (data.available) {
            showValidationMessage(input, message, "Brand name is available", true);
        } else {
            showValidationMessage(input, message, "Brand name already exists", false);
        }
    } catch (err) {
        console.error(err);
        showValidationMessage(input, message, "Error checking brand name", false);
    }


}
// ===================== COUNTRY =====================
function checkCountry() {
    const input = document.getElementById("country");
    const message = document.getElementById("countryMessage");
    const value = input.value.trim();

    if (!value) {
        input.classList.remove("is-valid", "is-invalid");
        message.textContent = "";
        return;
    }

    // Only letters and spaces
    if (!/^[A-Za-zÁÉÍÓÚÑáéíóúñ\s]+$/.test(value)) {
        showValidationMessage(input, message, "Country must contain only letters", false);
        return;
    }

    // First letter uppercase
    if (value[0] !== value[0].toUpperCase()) {
        showValidationMessage(input, message, "Country must start with an uppercase letter", false);
        return;
    }

    // Length check
    if (value.length < 2 || value.length > 60) {
        showValidationMessage(input, message, "Country must be between 2 and 60 characters", false);
        return;
    }

    // If all checks pass
    showValidationMessage(input, message, "Country format is valid", true);
}
// ===================== IMAGE PREVIEW AND REMOVAL =====================
document.addEventListener("DOMContentLoaded", () => {
    const imageInput = document.getElementById("imageBrand");
    const imagePreview = document.getElementById("imageBrandPreview");
    const removeImageBtn = document.getElementById("removeImageBrand");

    if (imageInput && imagePreview && removeImageBtn) {
        imageInput.addEventListener("change", () => {
            const file = imageInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    imagePreview.src = e.target.result;
                    imagePreview.style.display = "block";
                    removeImageBtn.style.display = "inline-block";
                }
                reader.readAsDataURL(file);
            } else {
                // If no file, hide preview and remove button
                imagePreview.src = "";
                imagePreview.style.display = "none";
                removeImageBtn.style.display = "none";
            }
        });

        // Remove image button functionality
        removeImageBtn.addEventListener("click", () => {
            imageInput.value = ""; // Clear file input
            imagePreview.src = ""; // Clear preview
            imagePreview.style.display = "none";
            removeImageBtn.style.display = "none";
        });
    }
});

// ===================== DESCRIPTION =====================
function checkDescription() {
    const input = document.getElementById("description");
    const message = document.getElementById("descriptionMessage");
    const value = input.value.trim();

    if (!value) {
        input.classList.remove("is-valid", "is-invalid");
        message.textContent = "";
        return;
    }

    if (value.length >= 10 && value.length <= 300) {
        showValidationMessage(input, message, "Description is valid", true);
    } else {
        showValidationMessage(input, message, "Description must be 10-300 characters", false);
    }
}

// ===================== EVENT LISTENERS =====================
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("brand")?.addEventListener("input", checkBrandName);
    document.getElementById("country")?.addEventListener("input", checkCountry);
    document.getElementById("description")?.addEventListener("input", checkDescription);
});

// ===================== FORM SUBMIT SPINNER =====================
document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector(".car-form");
    if (!form) return;

    const spinner = document.getElementById("form-spinner");
    const saveButton = form.querySelector("button[type='submit']");

    if (!spinner || !saveButton) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const invalidFields = document.querySelectorAll(".is-invalid")
        const noInvalidFieldsPresent = invalidFields?.length === 0;
        const dialog = loadDialogWindow();
        console.log(invalidFields);
        spinner.classList.remove("d-none");
        saveButton.disabled = true;

        setTimeout(() => {
            if (noInvalidFieldsPresent)
                form.submit();
            else 
                showFixError(dialog, [...invalidFields]);
        }, 500);


    });
});
// ===================== NEW MODEL INFO VALIDATION =====================

// ===================== MODEL NAME =====================

// Real-time validation of model name with AJAX check
async function checkModelName() {
    const input = document.getElementById("model");
    const message = document.getElementById("modelMessage");
    const value = input.value.trim();

    if (!value) {
        input.classList.remove("is-valid", "is-invalid");
        message.textContent = "";
        return;
    }

    // Local syntax validation
    const syntaxValid = /^[A-ZÁÉÍÓÚÑ][a-zA-Z0-9\sáéíóúñÁÉÍÓÚÑ]{0,29}$/.test(value);
    if (!syntaxValid) {
        showValidationMessage(input, message, "Model must start with uppercase letter and be max 30 characters", false);
        return;
    }
    // Availability check via AJAX
    try {
        const brandId = obtainBrandID();
        if (!brandId) return;
        const response = await fetch(`/brand/${brandId}/model/check-name?modelName=${encodeURIComponent(value)}`);
        const data = await response.json();

        if (data.available && data.correct) {
            showValidationMessage(input, message, "Model name is available", true);
        }
        if (data.available && !data.correct) {
            showValidationMessage(input, message, "Model name must start with an uppercase letter or a number, and have a maximum of 30 characters", false);
        }
        if (!data.available) {
            showValidationMessage(input, message, "Model name already exists", false);
        }


    } catch (err) {
        console.error(err);
        showValidationMessage(input, message, "Error checking model name", false);
    }
}

// ===================== YEAR =====================
function checkYear() {
    const input = document.getElementById("year");
    const message = document.getElementById("yearMessage");
    const value = input.value.trim();

    if (!value) {
        input.classList.remove("is-valid", "is-invalid");
        message.textContent = "";
        return;
    }

    const year = parseInt(value, 10);
    if (Number.isNaN(year)) {
        showValidationMessage(input, message, "Year must be a positivenumber", false);
        return;
    }

    const now = new Date().getFullYear();
    if (year < 1850 || year > now) {
        showValidationMessage(input, message, "Year must be between 1850 and current year", false);
        return;
    } else {
        showValidationMessage(input, message, "Year is valid", true);
    }
}

// ===================== HORSEPOWER =====================
function checkHP() {
    const input = document.getElementById("HP");
    const message = document.getElementById("HPMessage");
    const value = input.value.trim();

    if (!value) {
        input.classList.remove("is-valid", "is-invalid");
        message.textContent = "";
        return;
    }

    const hp = parseInt(value, 10);
    if (Number.isNaN(hp) || !/^[0-9]+$/.test(value)) {
        showValidationMessage(input, message, "HP must be a  positive number", false);
        return;
    }

    if (hp > 10000) {
        showValidationMessage(input, message, "HP must not exceed 10000", false);
        return;
    }

    if (hp <= 0) {
        showValidationMessage(input, message, "HP must be greater than 0", false);
        return;
    }

    showValidationMessage(input, message, "HP is valid", true);
}

// ===================== DAILY PRICE =====================
function checkDailyPrice() {
    const input = document.getElementById("daily_price");
    const message = document.getElementById("daily_priceMessage");
    const value = input.value.trim();

    if (!value) {
        input.classList.remove("is-valid", "is-invalid");
        message.textContent = "";
        return;
    }

    const price = parseInt(value, 10);
    if (Number.isNaN(price) || !/^[0-9]+$/.test(value)) {
        showValidationMessage(input, message, "Price must be a  positive number", false);
        return;
    }

    if (price > 1000000) {
        showValidationMessage(input, message, "Price must not exceed 1,000,000", false);
        return;
    }

    if (price <= 0) {
        showValidationMessage(input, message, "Price must be greater than 0", false);
        return;
    }

    showValidationMessage(input, message, "Price is valid", true);
}
// ===================== IMAGE PREVIEW AND REMOVAL =====================
document.addEventListener("DOMContentLoaded", () => {
    const imageInput = document.getElementById("imageModel");
    const imagePreview = document.getElementById("imageModelPreview");
    const removeImageBtn = document.getElementById("removeImageModel");

    if (imageInput && imagePreview && removeImageBtn) {
        imageInput.addEventListener("change", () => {
            const file = imageInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    imagePreview.src = e.target.result;
                    imagePreview.style.display = "block";
                    removeImageBtn.style.display = "inline-block";
                }
                reader.readAsDataURL(file);
            } else {
                // If no file, hide preview and remove button
                imagePreview.src = "";
                imagePreview.style.display = "none";
                removeImageBtn.style.display = "none";
            }
        });

        // Remove image button functionality
        removeImageBtn.addEventListener("click", () => {
            imageInput.value = ""; // Clear file input
            imagePreview.src = ""; // Clear preview
            imagePreview.style.display = "none";
            removeImageBtn.style.display = "none";
        });
    }
});
// ===================== TECHNICAL SPECIFICATIONS =====================
function checkTechnicalSpecs() {
    const input = document.getElementById("technical_specifications");
    const message = document.getElementById("technicalMessage");
    const value = input.value.trim();

    if (!value) {
        input.classList.remove("is-valid", "is-invalid");
        message.textContent = "";
        return;
    }

    if (value.length >= 10 && value.length <= 300) {
        showValidationMessage(input, message, "Technical specifications are valid", true);
    } else {
        showValidationMessage(input, message, "Must be between 10-300 characters", false);
    }
}

// ===================== RENTAL CONDITIONS =====================
function checkRentalConditions() {
    const input = document.getElementById("rental_conditions");
    const message = document.getElementById("rentalMessage");
    const value = input.value.trim();

    if (!value) {
        input.classList.remove("is-valid", "is-invalid");
        message.textContent = "";
        return;
    }

    if (value.length >= 10 && value.length <= 300) {
        showValidationMessage(input, message, "Rental conditions are valid", true);
    } else {
        showValidationMessage(input, message, "Must be between 10-300 characters", false);
    }
}

// ===================== INTERESTING FACTS =====================
function checkInterestingFacts() {
    const input = document.getElementById("interesting_facts");
    const message = document.getElementById("factsMessage");
    const value = input.value.trim();

    if (!value) {
        input.classList.remove("is-valid", "is-invalid");
        message.textContent = "";
        return;
    }

    if (value.length >= 10 && value.length <= 300) {
        showValidationMessage(input, message, "Interesting facts are valid", true);
    } else {
        showValidationMessage(input, message, "Must be between 10-300 characters", false);
    }
}

// ===================== EVENT LISTENERS =====================
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("model")?.addEventListener("input", checkModelName);
    document.getElementById("year")?.addEventListener("input", checkYear);
    document.getElementById("HP")?.addEventListener("input", checkHP);
    document.getElementById("daily_price")?.addEventListener("input", checkDailyPrice);
    document.getElementById("technical_specifications")?.addEventListener("input", checkTechnicalSpecs);
    document.getElementById("rental_conditions")?.addEventListener("input", checkRentalConditions);
    document.getElementById("interesting_facts")?.addEventListener("input", checkInterestingFacts);
});

// ===================== FORM VALIDATION ON SUBMIT =====================
document.addEventListener("DOMContentLoaded", () => {
    const forms = document.querySelectorAll(".car-form");

    forms.forEach(form => {
        form.addEventListener("submit", (e) => {
            // Get all input and textarea fields in the form
            const invalidFields = form.querySelectorAll(".is-invalid");

            // If there are invalid fields, prevent submission
            if (invalidFields.length > 0) {
                e.preventDefault();
                const dialog = loadDialogWindow();
                const invalidFieldsList = [...invalidFields];
                showFixError(dialog, invalidFieldsList);
                return;
            }
        });
    });
});

// =============================================================
// ===================== EDIT BRAND LOGIC ======================
// =============================================================

// ===================== EDIT BRAND NAME VALIDATION =====================
async function checkEditBrandName() {
    const input = document.getElementById("editBrandName");
    const message = document.getElementById("editBrandNameMessage");

    // Safety check
    if (!input) return;

    const value = input.value.trim();
    // Get original value from data attribute
    const originalValue = input.getAttribute("data-original");

    if (!value) {
        input.classList.remove("is-valid", "is-invalid");
        message.textContent = "";
        return;
    }

    // 1. Local syntax validation
    const syntaxValid = /^[A-ZÁÉÍÓÚÑ][a-zA-Z0-9\sáéíóúñÁÉÍÓÚÑ-]{0,29}$/.test(value);
    if (!syntaxValid) {
        showValidationMessage(input, message, "Brand must start with uppercase and be max 30 characters", false);
        return;
    }

    // 2. Availability check via AJAX
    // If the value is the same as the original, we don't make an AJAX request and consider it valid
    if (value === originalValue) {
        showValidationMessage(input, message, "Current brand name is valid", true);
        return;
    }

    try {
        const response = await fetch(`/brand/check-name?brandName=${encodeURIComponent(value)}`);
        const data = await response.json();

        if (data.available) {
            showValidationMessage(input, message, "Brand name is available", true);
        } else {
            showValidationMessage(input, message, "Brand name already exists", false);
        }

    } catch (err) {
        console.error(err);
        showValidationMessage(input, message, "Error checking brand name", false);
    }
}

// ===================== EDIT COUNTRY VALIDATION =====================
function checkEditCountry() {
    const input = document.getElementById("editCountry");
    const message = document.getElementById("editCountryMessage");
    const value = input.value.trim();

    if (!value) {
        input.classList.remove("is-valid", "is-invalid");
        message.textContent = "";
        return;
    }

    if (!/^[A-Za-zÁÉÍÓÚÑáéíóúñ\s]+$/.test(value)) {
        showValidationMessage(input, message, "Country must contain only letters", false);
        return;
    }

    if (value[0] !== value[0].toUpperCase()) {
        showValidationMessage(input, message, "Country must start with an uppercase letter", false);
        return;
    }

    if (value.length < 2 || value.length > 60) {
        showValidationMessage(input, message, "Country must be between 2 and 60 characters", false);
        return;
    }

    showValidationMessage(input, message, "Country format is valid", true);
}

// ===================== EDIT DESCRIPTION VALIDATION =====================
function checkEditDescription() {
    const input = document.getElementById("editDescription");
    const message = document.getElementById("editDescriptionMessage");
    const value = input.value.trim();

    if (!value) {
        input.classList.remove("is-valid", "is-invalid");
        message.textContent = "";
        return;
    }

    if (value.length >= 10 && value.length <= 300) {
        showValidationMessage(input, message, "Description is valid", true);
    } else {
        showValidationMessage(input, message, "Description must be 10-300 characters", false);
    }
}

// ===================== EDIT IMAGE PREVIEW AND REMOVAL =====================
document.addEventListener("DOMContentLoaded", async () => {
    const imageInput = document.getElementById("editImage");
    const imagePreview = document.getElementById("editImagePreview");
    const removeImageBtn = document.getElementById("removeEditImage");

    if (imageInput && imagePreview && removeImageBtn) {
        // Brand ID. Needed for the current logo fetch for preview.
        const brandid = document.getElementById("editBrandForm")?.getAttribute("data-id");
        const logoImageRoute = `/brand/${brandid}/image`;

        // Obtain logo. If everything went well, show it in the preview field.
        const NewestLogoImage = await fetch(logoImageRoute);
        if (NewestLogoImage.ok){
            imagePreview.style.display = "block";
            removeImageBtn.style.display = "inline-block";
            imagePreview.src = logoImageRoute;
        }

        imageInput.addEventListener("change", () => {
            const file = imageInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    imagePreview.src = e.target.result;
                    imagePreview.style.display = "block";
                    removeImageBtn.style.display = "inline-block";
                }
                reader.readAsDataURL(file);
            } else {
                // If no file, hide preview and remove button
                imagePreview.src = "";
                imagePreview.style.display = "none";
                removeImageBtn.style.display = "none";
            }
        });

        // Remove image button functionality
        removeImageBtn.addEventListener("click", () => {
            imageInput.value = ""; // Clear file input
            imagePreview.src = ""; // Clear preview
            imagePreview.style.display = "none";
            removeImageBtn.style.display = "none";
        });
    }
});

// ===================== EDIT PAGE EVENT LISTENERS =====================
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("editBrandName")?.addEventListener("input", checkEditBrandName);
    document.getElementById("editCountry")?.addEventListener("input", checkEditCountry);
    document.getElementById("editDescription")?.addEventListener("input", checkEditDescription);

    // Form spinner setup for edit brand form
    setupFormSpinner("#editBrandForm", "edit-form-spinner");
});

// ===================== EDIT FORM VALIDATION ON SUBMIT =====================
document.addEventListener("DOMContentLoaded", () => {
    const editForm = document.getElementById("editBrandForm");

    if (editForm) {
        editForm.addEventListener("submit", (e) => {
            // Get all input and textarea fields with errors
            const invalidFields = editForm.querySelectorAll(".is-invalid");

            // If there are invalid fields, prevent submission
            if (invalidFields.length > 0) {
                e.preventDefault();
                const invalidFieldsList = [...invalidFields];
                const dialog = loadDialogWindow();

                //  Hide spinner if visible
                const spinner = document.getElementById("edit-form-spinner");
                if (spinner) spinner.classList.add("d-none");

                // Re-enable submit button
                const btn = editForm.querySelector("button[type='submit']");
                if (btn) btn.disabled = false;

                showFixError(dialog, invalidFieldsList);
            }
        });
    }
});
