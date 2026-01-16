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
        container?.insertAdjacentHTML('beforeend', cardHTML);
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
                
                // Check if there are no more models left
                const brandModelSection = document.getElementById("brandModelSection");
                const remainingModels = brandModelSection.querySelectorAll(".brand-card");
                
                // If no models remain, show the "no models" message
                if (remainingModels.length === 0) {
                    const noModelsMsg = document.createElement("p");
                    noModelsMsg.textContent = "This brand has no models currently.";
                    brandModelSection.appendChild(noModelsMsg);
                }
            }
            else {
                showErrorWindow(dialog, response);
            }
        }
        // Button pressed is the brand deletion button
        else if (targetButton.id === "brandDeletionButton") {
            confirmBrandDeletion(dialog, brandid);
        }
    })

    const createForm = document.getElementById("createForm");

    createForm?.addEventListener("submit", async (e) => {
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

                    const file = await loadDefaultModelImage();

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
                const file = await loadDefaultModelImage();
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

async function loadDefaultModelImage() {
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

async function loadDefaultBrandImage() {
    const response = await fetch('/default_logo.jpg');

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
    
    // Clear validation states and messages
    if (form) {
        // Remove all validation classes from form inputs
        const validatedInputs = form.querySelectorAll(".is-valid, .is-invalid");
        validatedInputs.forEach(input => {
            input.classList.remove("is-valid", "is-invalid");
        });
        
        // Clear all validation messages
        const validationMessages = form.querySelectorAll("[id$=Message], [class$=msg]");
        validationMessages.forEach(msg => {
            msg.textContent = "";
            msg.style.color = "";
        });
    }
    
    // Hide the remove image button
    const removeImageButton = document.getElementById("removeImageButton");
    if (removeImageButton) {
        removeImageButton.classList.add("d-none");
    }
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
    card.dataset.brandid = brandid;
    card.style.position = "relative";

    // Fill content in the card with complete structure (display + edit form)
    // Match the exact same structure as info.html for consistency
    card.innerHTML = `
        <!-- VISTA NORMAL -->
        <div class="mt-3 model-display">
            <img src="/brand/${brandid}/model/${car.name}/image" alt="${car.name}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27300%27 height=%27200%27%3E%3Crect fill=%27%23f0f0f0%27 width=%27300%27 height=%27200%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 text-anchor=%27middle%27 dy=%27.3em%27 fill=%27%23999%27 font-family=%27Arial%27 font-size=%2716%27%3ENo Image Available%3C/text%3E%3C/svg%3E'">
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

        <!-- EDIT VIEW (hidden) -->
        <form class="mt-3 model-edit-form d-none" enctype="multipart/form-data">
            <div class="mb-3">
                <label class="form-label">Name</label>
                <input type="text" class="form-control model-edit-name" name="modelName" value="${car.name}" required>
                <span class="model-edit-name-msg"></span>
            </div>

            <div class="mb-3">
                <label class="form-label">Year of Release</label>
                <input type="number" class="form-control model-edit-year" name="year" value="${car.year}" required>
                <span class="model-edit-year-msg"></span>
            </div>

            <div class="mb-3">
                <label class="form-label">Horsepower</label>
                <input type="number" class="form-control model-edit-hp" name="HP" value="${car.HP}" required>
                <span class="model-edit-hp-msg"></span>
            </div>

            <div class="mb-3">
                <label class="form-label">Daily Price</label>
                <input type="number" class="form-control model-edit-price" name="daily_price" value="${car.daily_price}" required>
                <span class="model-edit-price-msg"></span>
            </div>

            <div class="mb-3">
                <label>Image</label>
                <div class="drop-zone model-drop-zone">
                    <span>Drag an image here or click</span>
                    <input type="file" name="image" class="model-image-input" accept="image/*" hidden>
                </div>
            </div>

            <div class="mb-3">
                <label>Image Preview</label><br>
                <small class="model-image-preview"></small>
                <button type="button" class="btn btn-sm btn-outline-danger ms-2 model-remove-image">Remove Image</button>
            </div>

            <div class="mb-3">
                <label class="form-label">Technical Specifications</label>
                <textarea class="form-control model-edit-specs" name="technical_specifications" rows="3" required>${car.technical_specifications}</textarea>
                <span class="model-edit-specs-msg"></span>
            </div>

            <div class="mb-3">
                <label class="form-label">Rental Conditions</label>
                <textarea class="form-control model-edit-rental" name="rental_conditions" rows="3" required>${car.rental_conditions}</textarea>
                <span class="model-edit-rental-msg"></span>
            </div>

            <div class="mb-3">
                <label class="form-label">Interesting Facts</label>
                <textarea class="form-control model-edit-facts" name="interesting_facts" rows="3" required>${car.interesting_facts}</textarea>
                <span class="model-edit-facts-msg"></span>
            </div>

            <div class="button-group d-flex justify-content-between">
                <button type="submit" class="btn btn-dark model-save-btn">Save Changes</button>
                <button type="button" class="btn btn-outline-secondary model-cancel-btn">Cancel</button>
            </div>
        </form>
        
        <!-- Spinner for model edit -->
        <div class="d-none spinner-overlay model-edit-spinner">
            <div class="spinner-content">
                <div class="car-spinner-final">
                    <div class="top-car">🏎️</div>
                </div>
                <small>Updating model...</small>
            </div>
        </div>
    `;

    // Inserting after all of the other model cards
    const container = document.getElementById("brandModelSection");
    
    // Remove the "no models" message if it exists
    const noModelsMsg = Array.from(container.children).find(child => 
        child.tagName === 'P' && child.textContent.includes("This brand has no models")
    );
    if (noModelsMsg) {
        noModelsMsg.remove();
    }
    
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
    dropZone?.addEventListener("click", () => fileInput.click());

    // Visuals for dragging over and away from the drop zone
    dropZone?.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    });

    dropZone?.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });

    // Handler for dropping a file
    dropZone?.addEventListener("drop", (e) => {
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
    fileInput?.addEventListener("change", () => {
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
    form.addEventListener("submit", async (e) => {
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

        setTimeout(async () => {
            if (redirectUrl) {
                window.location.href = redirectUrl;
            } else {
                if (saveButton.classList.contains("newBrandButton") || saveButton.classList.contains("editBrandButton")) {
                    if (noInvalidFieldsPresent) {
                        form.submit();


                    }
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
    return document.getElementById("brandField")?.getAttribute("data-brandid");
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

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const invalidFields = document.querySelectorAll(".is-invalid")
        const brandid = document.getElementById("editBrandForm")?.getAttribute("data-id");
        const noInvalidFieldsPresent = invalidFields?.length === 0;
        const dialog = loadDialogWindow();
        spinner.classList.remove("d-none");
        saveButton.disabled = true;

        const formData = await obtainEditedFormData(form);

        setTimeout(async () => {
            if (noInvalidFieldsPresent) {
                // form.submit();
                await fetch(`/brand/${brandid}/edit`, {
                    method: "POST",
                    body: formData
                });
                window.location.href = `/brand/${brandid}`;
            }
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
    const syntaxValid = /^[A-Z0-9ÁÉÍÓÚÑ][a-zA-Z0-9\sáéíóúñÁÉÍÓÚÑ]{0,29}$/.test(value);
    if (!syntaxValid) {
        showValidationMessage(input, message, "Model must start with uppercase letter or number and be max 30 characters", false);
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
        if (NewestLogoImage.ok) {
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


});

// ===================== EDIT FORM VALIDATION ON SUBMIT =====================
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("editBrandForm");
    if (!form) return;

    const spinner = document.getElementById("edit-form-spinner");
    const saveButton = form.querySelector("button[type='submit']");
    if (!spinner || !saveButton) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const invalidFields = form.querySelectorAll(".is-invalid");
        const dialog = loadDialogWindow();
        const brandid = form.getAttribute("data-id");

        // Prev validation check - if there are invalid fields, show error dialog 
        if (invalidFields.length > 0) {
            showFixError(dialog, [...invalidFields]);
            return; // Exit the function early
        }

        // No errors found, proceed with form submission and show spinner
        spinner.classList.remove("d-none");
        saveButton.disabled = true;
        document.body.style.overflow = "hidden"; // Prevent scrolling while spinner is active

        // Obtain edited form data 
        const formData = await obtainEditedFormData(form);

        try {
            // Send AJAX request to update brand
            const response = await fetch(`/brand/${brandid}/edit`, {
                method: "POST",
                body: formData
            });

            // If there was an error during submission, show error dialog
            if (!response.ok) {
                spinner.classList.add("d-none");
                saveButton.disabled = false;
                document.body.style.overflow = ""; // Re-enable scrolling
                showErrorWindow(dialog, response);
                return;
            }

            // If everything went well, wait for spinner to show then redirect to brand page
            setTimeout(() => {
                window.location.href = `/brand/${brandid}`;
            }, 1000);

        } catch (error) {
            // Handle network errors
            spinner.classList.add("d-none");
            saveButton.disabled = false;
            document.body.style.overflow = ""; // Re-enable scrolling
            showErrorWindow(dialog, { status: 500, statusText: "Network Error" });
        }
    });
});


async function obtainEditedFormData(form) {
    const formData = new FormData(form);
    const removeButton = document.getElementById("removeEditImage");
    const btn = form.querySelector("button[type='submit']");
    const buttonIsForBrand = btn.classList.contains("newBrandButton") || btn.classList.contains("editBrandButton");
    const imageHasBeenAdded = buttonIsForBrand && removeButton?.style.display !== "none";

    if (!imageHasBeenAdded) {
        const file = await loadDefaultBrandImage();
        formData.append("image", file);
    }

    return formData;
}

// ===================== EDIT MODEL IN INFO PAGE =====================
// When the info page loads, configure model editing buttons
document.addEventListener("DOMContentLoaded", () => {
    setupModelEditButtons();
});

function setupModelEditButtons() {
    // Use event delegation to capture clicks on dynamically created buttons
    const brandModelSection = document.getElementById('brandModelSection');
    if (!brandModelSection) return;
    
    brandModelSection.addEventListener('click', (e) => {
        const btn = e.target.closest('.editModelButton');
        if (!btn) return;
        
        e.preventDefault();
        const card = btn.closest('.brand-card');
        const modelName = card.getAttribute('data-modelname');
        const brandId = card.getAttribute('data-brandid');
        
        // Show the edit form and load the data
        toggleModelEditForm(card);
        setupEditModelForm(card, brandId, modelName);
    });
}

function toggleModelEditForm(card) {
    const displayDiv = card.querySelector('.model-display');
    const editForm = card.querySelector('.model-edit-form');
    
    displayDiv.classList.toggle('d-none');
    editForm.classList.toggle('d-none');
}

function setupEditModelForm(card, brandId, oldModelName) {
    const editForm = card.querySelector('.model-edit-form');
    const nameInput = editForm.querySelector('.model-edit-name');
    const yearInput = editForm.querySelector('.model-edit-year');
    const hpInput = editForm.querySelector('.model-edit-hp');
    const priceInput = editForm.querySelector('.model-edit-price');
    const specsInput = editForm.querySelector('.model-edit-specs');
    const rentalInput = editForm.querySelector('.model-edit-rental');
    const factsInput = editForm.querySelector('.model-edit-facts');
    const dropZone = editForm.querySelector('.model-drop-zone');
    const fileInput = editForm.querySelector('.model-image-input');
    const previewField = editForm.querySelector('.model-image-preview');
    const removeBtn = editForm.querySelector('.model-remove-image');
    const cancelBtn = editForm.querySelector('.model-cancel-btn');
    const submitBtn = editForm.querySelector('.model-save-btn');
    
    
    let selectedImageFile = null;
    
    // Load existing model data into the form
    const displayDiv = card.querySelector('.model-display');
    const nameSpan = displayDiv.querySelector('.car-name');
    const detailsSpan = displayDiv.querySelector('.car-details');
    const priceSpan = displayDiv.querySelector('.car-price');
    const paragraphs = displayDiv.querySelectorAll('p');
    
    // Extract model data
    const modelName = nameSpan.textContent.trim();
    const details = detailsSpan.textContent.trim().split(' • ');
    const year = details[0].trim();
    const hp = details[1].trim().replace(' HP', '');
    const price = priceSpan.textContent.trim().replace('$/day', '').trim();
    
    // Extract text from paragraphs (removing <strong> tags)
    let specs = '';
    let rental = '';
    let facts = '';
    
    // Extract text from paragraphs (removing <strong> tags)
    if (paragraphs[0]) {
        specs = paragraphs[0].textContent.replace('Technical Specifications:', '').trim();
    }
    if (paragraphs[1]) {
        rental = paragraphs[1].textContent.replace('Rental Conditions:', '').trim();
    }
    if (paragraphs[2]) {
        facts = paragraphs[2].textContent.replace('Interesting Facts:', '').trim();
    }
    
    nameInput.value = modelName;
    yearInput.value = year;
    hpInput.value = hp;
    priceInput.value = price;
    specsInput.value = specs;
    rentalInput.value = rental;
    factsInput.value = facts;
    
    // Fetch model data from server to check if image exists
    fetch(`/brand/${brandId}/model/${oldModelName}`)
        .then(response => response.json())
        .then(modelObject => {
            const model = modelObject.models[0];
            // If image exists and is not null, show it. Otherwise show placeholder
            if (model.image) {
                // Add cache-busting parameter to force reload of updated images
                previewField.innerHTML = `<img src="/brand/${brandId}/model/${oldModelName}/image?t=${Date.now()}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27200%27 height=%27200%27%3E%3Crect fill=%27%23f0f0f0%27 width=%27200%27 height=%27200%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 text-anchor=%27middle%27 dy=%27.3em%27 fill=%27%23999%27 font-family=%27Arial%27 font-size=%2714%27%3ENo Image%3C/text%3E%3C/svg%3E'" style="max-width: 200px; max-height: 200px; border: 1px solid #ddd;">`;
            } else {
                // Show placeholder when no image exists
                previewField.innerHTML = `<img src="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27200%27 height=%27200%27%3E%3Crect fill=%27%23f0f0f0%27 width=%27200%27 height=%27200%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 text-anchor=%27middle%27 dy=%27.3em%27 fill=%27%23999%27 font-family=%27Arial%27 font-size=%2714%27%3ENo Image%3C/text%3E%3C/svg%3E'" style="max-width: 200px; max-height: 200px; border: 1px dashed #999;">`;
            }
        })
        .catch(error => {
            console.error('Error fetching model data:', error);
            previewField.innerHTML = `<img src="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27200%27 height=%27200%27%3E%3Crect fill=%27%23f0f0f0%27 width=%27200%27 height=%27200%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 text-anchor=%27middle%27 dy=%27.3em%27 fill=%27%23999%27 font-family=%27Arial%27 font-size=%2714%27%3ENo Image%3C/text%3E%3C/svg%3E'" style="max-width: 200px; max-height: 200px; border: 1px dashed #999;">`;
        });
    
    // Clean up previous listeners by replacing nodes
    const newNameInput = nameInput.cloneNode(true);
    nameInput.parentNode.replaceChild(newNameInput, nameInput);
    const newYearInput = yearInput.cloneNode(true);
    yearInput.parentNode.replaceChild(newYearInput, yearInput);
    const newHpInput = hpInput.cloneNode(true);
    hpInput.parentNode.replaceChild(newHpInput, hpInput);
    const newPriceInput = priceInput.cloneNode(true);
    priceInput.parentNode.replaceChild(newPriceInput, priceInput);
    const newSpecsInput = specsInput.cloneNode(true);
    specsInput.parentNode.replaceChild(newSpecsInput, specsInput);
    const newRentalInput = rentalInput.cloneNode(true);
    rentalInput.parentNode.replaceChild(newRentalInput, rentalInput);
    const newFactsInput = factsInput.cloneNode(true);
    factsInput.parentNode.replaceChild(newFactsInput, factsInput);
    
    // Also clean up button listeners
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    const newSubmitBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
    
    // Update references after cloning
    const updatedEditForm = card.querySelector('.model-edit-form');
    const updatedNameInput = updatedEditForm.querySelector('.model-edit-name');
    const updatedYearInput = updatedEditForm.querySelector('.model-edit-year');
    const updatedHpInput = updatedEditForm.querySelector('.model-edit-hp');
    const updatedPriceInput = updatedEditForm.querySelector('.model-edit-price');
    const updatedSpecsInput = updatedEditForm.querySelector('.model-edit-specs');
    const updatedRentalInput = updatedEditForm.querySelector('.model-edit-rental');
    const updatedFactsInput = updatedEditForm.querySelector('.model-edit-facts');
    const updatedCancelBtn = updatedEditForm.querySelector('.model-cancel-btn');
    const updatedSubmitBtn = updatedEditForm.querySelector('.model-save-btn');
    
    updatedNameInput.value = modelName;
    updatedYearInput.value = year;
    updatedHpInput.value = hp;
    updatedPriceInput.value = price;
    updatedSpecsInput.value = specs;
    updatedRentalInput.value = rental;
    updatedFactsInput.value = facts;
    
    // Setup drop zone
    setupEditModelDropZone(dropZone, fileInput, previewField, removeBtn, brandId, oldModelName,
                           () => selectedImageFile, 
                           (file) => { selectedImageFile = file; });
    
    // Setup validaciones in real time
    updatedNameInput.addEventListener('input', () => validateEditModelName(updatedNameInput, updatedEditForm, brandId, oldModelName));
    updatedYearInput.addEventListener('input', () => validateEditYear(updatedYearInput, updatedEditForm));
    updatedHpInput.addEventListener('input', () => validateEditHP(updatedHpInput, updatedEditForm));
    updatedPriceInput.addEventListener('input', () => validateEditDailyPrice(updatedPriceInput, updatedEditForm));
    updatedSpecsInput.addEventListener('input', () => validateEditTechnicalSpecs(updatedSpecsInput, updatedEditForm));
    updatedRentalInput.addEventListener('input', () => validateEditRentalConditions(updatedRentalInput, updatedEditForm));
    updatedFactsInput.addEventListener('input', () => validateEditInterestingFacts(updatedFactsInput, updatedEditForm));
    
    // Cancel button
    updatedCancelBtn.addEventListener('click', () => {
        toggleModelEditForm(card);
        selectedImageFile = null;
        fileInput.value = '';
        updatedEditForm.reset();
    });
    
    // Submit button
    updatedSubmitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        // Validate all fields
        const isNameValid = await validateEditModelName(updatedNameInput, updatedEditForm, brandId, oldModelName);
        const isYearValid = validateEditYear(updatedYearInput, updatedEditForm);
        const isHPValid = validateEditHP(updatedHpInput, updatedEditForm);
        const isPriceValid = validateEditDailyPrice(updatedPriceInput, updatedEditForm);
        const isSpecsValid = validateEditTechnicalSpecs(updatedSpecsInput, updatedEditForm);
        const isRentalValid = validateEditRentalConditions(updatedRentalInput, updatedEditForm);
        const isFactsValid = validateEditInterestingFacts(updatedFactsInput, updatedEditForm);
        
        if (!isNameValid || !isYearValid || !isHPValid || !isPriceValid || 
            !isSpecsValid || !isRentalValid || !isFactsValid) {
            return;
        }
        
        // Create FormData to send
        const formData = new FormData();
        formData.append('modelName', updatedNameInput.value);
        formData.append('year', updatedYearInput.value);
        formData.append('HP', updatedHpInput.value);
        formData.append('daily_price', updatedPriceInput.value);
        formData.append('technical_specifications', updatedSpecsInput.value);
        formData.append('rental_conditions', updatedRentalInput.value);
        formData.append('interesting_facts', updatedFactsInput.value);
        
        // Handle image: new, deleted, or keep previous
        if (selectedImageFile) {
            formData.append('image', selectedImageFile);
        } else if (removeBtn.hasAttribute('data-image-deleted')) {
            // if user marked image for deletion
            formData.append('deleteImage', 'true');
        }
        
        // Show spinner
        const spinner = card.querySelector('.model-edit-spinner');
        spinner.classList.remove('d-none');
        
        try {
            const response = await fetch(
                `/brand/${brandId}/model/${encodeURIComponent(oldModelName)}/edit`,
                {
                    method: 'POST',
                    body: formData
                }
            );
            
            if (!response.ok) {
                throw new Error('Error updating model');
            }
            
            const data = await response.json();
            
            spinner.classList.add('d-none');
            
            // Update the model card with new data
            updateModelCard(card, data, brandId);
            
            // Hide the edit form
            toggleModelEditForm(card);
            
            // Variable reset
            selectedImageFile = null;
            fileInput.value = '';
            updatedEditForm.reset();
            
        } catch (error) {
            spinner.classList.add('d-none');
            console.error('Error:', error);
        }
    });
}

function setupEditModelDropZone(dropZone, fileInput, previewField, removeBtn, brandId, oldModelName, getSelectedFile, setSelectedFile) {
    // Click to open file dialog
    dropZone.addEventListener('click', () => fileInput.click());
    
    // Drag over
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    // Drag leave
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    // Drop
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            showEditModelImagePreview(files[0], previewField, removeBtn);
            setSelectedFile(files[0]);
        }
    });
    
    // File input change
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            showEditModelImagePreview(fileInput.files[0], previewField, removeBtn);
            setSelectedFile(fileInput.files[0]);
            removeBtn.removeAttribute('data-image-deleted');
        }
    });
    
    // Remove button - marks image as deleted
    removeBtn.addEventListener('click', () => {
        fileInput.value = '';
        setSelectedFile(null);
        // Show 'no image' placeholder
        previewField.innerHTML = `<img src="" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27200%27 height=%27200%27%3E%3Crect fill=%27%23f0f0f0%27 width=%27200%27 height=%27200%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 text-anchor=%27middle%27 dy=%27.3em%27 fill=%27%23999%27 font-family=%27Arial%27 font-size=%2714%27%3ENo Image%3C/text%3E%3C/svg%3E'\" style="max-width: 200px; max-height: 200px; border: 1px dashed #999;">`;
        // Mark that user wants to delete the image
        removeBtn.setAttribute('data-image-deleted', 'true');
    });
}

function showEditModelImagePreview(file, previewField, removeBtn) {
    const reader = new FileReader();
    reader.onload = (e) => {
        previewField.innerHTML = `<img src="${e.target.result}" style="max-width: 200px; max-height: 200px;">`;
        removeBtn.classList.remove('d-none');
    };
    reader.readAsDataURL(file);
}

function updateModelCard(card, updatedData, brandId) {
    const displayDiv = card.querySelector('.model-display');
    const nameSpan = displayDiv.querySelector('.car-name');
    const detailsSpan = displayDiv.querySelector('.car-details');
    const priceSpan = displayDiv.querySelector('.car-price');
    const specsP = displayDiv.querySelectorAll('p')[0];
    const rentalP = displayDiv.querySelectorAll('p')[1];
    const factsP = displayDiv.querySelectorAll('p')[2];
    const imgElement = displayDiv.querySelector('img');
    
    // Update image with cache-busting
    imgElement.src = `/brand/${brandId}/model/${updatedData.name}/image?t=${Date.now()}`;
    imgElement.onerror = function() {
        this.src = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27300%27 height=%27200%27%3E%3Crect fill=%27%23f0f0f0%27 width=%27300%27 height=%27200%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 text-anchor=%27middle%27 dy=%27.3em%27 fill=%27%23999%27 font-family=%27Arial%27 font-size=%2716%27%3ENo Image Available%3C/text%3E%3C/svg%3E';
    };
    
    // Update text fields
    nameSpan.textContent = updatedData.name;
    detailsSpan.textContent = `${updatedData.year} • ${updatedData.HP} HP`;
    priceSpan.textContent = `${updatedData.daily_price}$/day`;
    specsP.innerHTML = `<strong>Technical Specifications:</strong> ${updatedData.technical_specifications}`;
    rentalP.innerHTML = `<strong>Rental Conditions:</strong> ${updatedData.rental_conditions}`;
    factsP.innerHTML = `<strong>Interesting Facts:</strong> ${updatedData.interesting_facts}`;
    
    // Update the ID and data-modelname if the name changed
    const oldName = card.id;
    if (oldName !== updatedData.name) {
        card.id = updatedData.name;
        card.setAttribute('data-modelname', updatedData.name);
        
        // Update edit button data-modelname
        const deleteBtn = card.querySelector('.deleteModelButton');
        if (deleteBtn) deleteBtn.setAttribute('data-modelname', updatedData.name);
    }
}

// ===================== VALIDATION FUNCTIONS FOR MODEL EDIT =====================

async function validateEditModelName(input, editForm, brandId, oldModelName) {
    const msgSpan = editForm.querySelector('.model-edit-name-msg');
    const modelName = input.value.trim();
    
    if (!modelName) {
        input.classList.remove("is-valid", "is-invalid");
        msgSpan.textContent = "";
        return false;
    }
    
    // Local syntax validation
    const syntaxValid = /^[A-Z0-9ÁÉÍÓÚÑ][a-zA-Z0-9\sáéíóúñÁÉÍÓÚÑ]{0,29}$/.test(modelName);
    if (!syntaxValid) {
        showValidationMessage(input, msgSpan, "Model must start with uppercase letter and be max 30 characters", false);
        return false;
    }
    
    // If the name didn't change, it's valid (no database validation needed)
    if (modelName === oldModelName) {
        showValidationMessage(input, msgSpan, "Model name is valid", true);
        return true;
    }
    
    // Check availability only if the name changed
    try {
        const response = await fetch(`/brand/${brandId}/model/check-name?modelName=${encodeURIComponent(modelName)}`);
        const data = await response.json();
        
        if (data.available && data.correct) {
            showValidationMessage(input, msgSpan, "Model name is available", true);
            return true;
        } else if (!data.correct) {
            showValidationMessage(input, msgSpan, "Model name must start with an uppercase letter or a number, and have a maximum of 30 characters", false);
            return false;
        } else {
            showValidationMessage(input, msgSpan, "Model name already exists", false);
            return false;
        }
    } catch (error) {
        showValidationMessage(input, msgSpan, "Error checking model name", false);
        return false;
    }
}

function validateEditYear(input, editForm) {
    const msgSpan = editForm.querySelector('.model-edit-year-msg');
    const value = input.value.trim();
    
    if (!value) {
        input.classList.remove("is-valid", "is-invalid");
        msgSpan.textContent = "";
        return false;
    }
    
    const year = parseInt(value, 10);
    if (Number.isNaN(year)) {
        showValidationMessage(input, msgSpan, "Year must be a positive number", false);
        return false;
    }
    
    const now = new Date().getFullYear();
    if (year < 1850 || year > now + 1) {
        showValidationMessage(input, msgSpan, "Year must be between 1850 and current year", false);
        return false;
    }
    
    showValidationMessage(input, msgSpan, "Year is valid", true);
    return true;
}

function validateEditHP(input, editForm) {
    const msgSpan = editForm.querySelector('.model-edit-hp-msg');
    const value = input.value.trim();
    
    if (!value) {
        input.classList.remove("is-valid", "is-invalid");
        msgSpan.textContent = "";
        return false;
    }
    
    const hp = parseInt(value, 10);
    if (Number.isNaN(hp) || !/^[0-9]+$/.test(value)) {
        showValidationMessage(input, msgSpan, "HP must be a positive number", false);
        return false;
    }
    
    if (hp > 10000) {
        showValidationMessage(input, msgSpan, "HP must not exceed 10000", false);
        return false;
    }
    
    if (hp <= 0) {
        showValidationMessage(input, msgSpan, "HP must be greater than 0", false);
        return false;
    }
    
    showValidationMessage(input, msgSpan, "HP is valid", true);
    return true;
}

function validateEditDailyPrice(input, editForm) {
    const msgSpan = editForm.querySelector('.model-edit-price-msg');
    const value = input.value.trim();
    
    if (!value) {
        input.classList.remove("is-valid", "is-invalid");
        msgSpan.textContent = "";
        return false;
    }
    
    const price = parseInt(value, 10);
    if (Number.isNaN(price) || !/^[0-9]+$/.test(value)) {
        showValidationMessage(input, msgSpan, "Daily price must be a positive number", false);
        return false;
    }
    
    if (price > 1000000) {
        showValidationMessage(input, msgSpan, "Daily price must not exceed $1,000,000", false);
        return false;
    }
    
    if (price <= 0) {
        showValidationMessage(input, msgSpan, "Daily price must be greater than 0", false);
        return false;
    }
    
    showValidationMessage(input, msgSpan, "Daily price is valid", true);
    return true;
}

function validateEditTechnicalSpecs(input, editForm) {
    const msgSpan = editForm.querySelector('.model-edit-specs-msg');
    const text = input.value.trim();
    
    if (!text) {
        input.classList.remove("is-valid", "is-invalid");
        msgSpan.textContent = "";
        return false;
    }
    
    if (text.length < 10) {
        showValidationMessage(input, msgSpan, "Technical specifications must be at least 10 characters", false);
        return false;
    }
    
    if (text.length > 300) {
        showValidationMessage(input, msgSpan, "Technical specifications cannot exceed 300 characters", false);
        return false;
    }
    
    showValidationMessage(input, msgSpan, "Technical specifications are valid", true);
    return true;
}

function validateEditRentalConditions(input, editForm) {
    const msgSpan = editForm.querySelector('.model-edit-rental-msg');
    const text = input.value.trim();
    
    if (!text) {
        input.classList.remove("is-valid", "is-invalid");
        msgSpan.textContent = "";
        return false;
    }
    
    if (text.length < 10) {
        showValidationMessage(input, msgSpan, "Rental conditions must be at least 10 characters", false);
        return false;
    }
    
    if (text.length > 300) {
        showValidationMessage(input, msgSpan, "Rental conditions cannot exceed 300 characters", false);
        return false;
    }
    
    showValidationMessage(input, msgSpan, "Rental conditions are valid", true);
    return true;
}

function validateEditInterestingFacts(input, editForm) {
    const msgSpan = editForm.querySelector('.model-edit-facts-msg');
    const text = input.value.trim();
    
    if (!text) {
        input.classList.remove("is-valid", "is-invalid");
        msgSpan.textContent = "";
        return false;
    }
    
    if (text.length < 10) {
        showValidationMessage(input, msgSpan, "Interesting facts must be at least 10 characters", false);
        return false;
    }
    
    if (text.length > 300) {
        showValidationMessage(input, msgSpan, "Interesting facts cannot exceed 300 characters", false);
        return false;
    }
    
    showValidationMessage(input, msgSpan, "Interesting facts are valid", true);
    return true;
}