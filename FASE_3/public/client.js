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


    //  Since router.js already has 'await setTimeout', this line will delay 800ms.


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

    // Checker for whenever something is clicked. Used to detect which buttons are pressed.
    document.addEventListener("click", async (event) => {
        let targetButton = event.target;
        console.log(targetButton);
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
        else if (targetButton.classList.contains("editModelButton")) {
            let modelName = obtainModelName(targetButton);

            let result = await fetch(`/brand/${brandid}/model/${modelName}`);
            let modelInfo = await result.json();
            let model = modelInfo.models[0];

            if (modelName) {
                document.getElementById("modelNameInputField").value = model.name;
                document.getElementById("HPInputField").value = model.HP;
                document.getElementById("yearInputField").value = model.year;
                document.getElementById("dailyPriceInputField").value = model.daily_price;
                document.getElementById("techSpecsInputField").innerText = model.technical_specifications;
                document.getElementById("rentCondInputField").innerText = model.rental_conditions;
                document.getElementById("inteFactsInputField").innerText = model.interesting_facts;
                document.getElementById("imgPreviewField").innerHTML = `<img src="/brand/${brandid}/model/${modelName}/image" style="max-width:100%; max-height:200px;"/>`
                hideShowInfoPage();
            }
        }
        else if (targetButton.classList.contains("cancelEditModel")) {
            hideShowInfoPage();
        }
    })

    // ------------------------------------------------------
    // MORE BUTTONS THAT NEED TO USE THE DIALOG MODEL GO HERE
    // ------------------------------------------------------
});

function hideShowInfoPage() {
    document.getElementById("brandField").classList.toggle("d-none");
    document.getElementById("brandModelSection").classList.toggle("d-none");
    document.getElementById("createModelForm").classList.toggle("d-none");
    document.getElementById("editModelForm").classList.toggle("d-none");
}

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
    const syntaxValid = /^[A-ZÁÉÍÓÚÑ][a-zA-Z0-9\sáéíóúñÁÉÍÓÚÑ]{0,29}$/.test(value);
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

// ===================== AJAX FORM SUBMIT =====================
const form = document.querySelector(".car-form");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const brand = document.getElementById("brand");
    const country = document.getElementById("country");
    const description = document.getElementById("description");

    if (
        brand.classList.contains("is-invalid") ||
        country.classList.contains("is-invalid") ||
        description.classList.contains("is-invalid")
    ) {
        return;
    }

    const formData = new FormData(form);

    try {
        const response = await fetch(form.action, {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            const dialog = loadDialogWindow();
            showErrorWindow(dialog, response);
            return;
        }

        const html = await response.text();
        document.body.innerHTML = html;

    } catch (err) {
        const dialog = loadDialogWindow();
        showErrorWindow(dialog, { status: 500, statusText: "Network error" });
    }
});
// ===================== NEW MODEL INFO VALIDATION =====================


async function checkModelNameAvailability() {
    const modelInput = document.getElementById("model");
    const modelMessage = document.getElementById("modelMessage");
    const modelName = modelInput.value.trim();

    // If it is empty, clear message
    if (!modelName) {
        modelMessage.textContent = "";
        return;
    }

    // Clear last requests for model input
    clearTimeout(debounceTimerModel);

    // Wait 500ms after user stops typing
    debounceTimerModel = setTimeout(async () => {
        try {
            const brandId = obtainBrandID();
            if (!brandId) return;

            const response = await fetch(`/brand/${brandId}/model/check-name?modelName=${encodeURIComponent(modelName)}`);
            const data = await response.json();

            if (data.available) {
                modelMessage.textContent = "Model name available";
                modelMessage.classList.remove("text-danger");
                modelMessage.classList.add("text-success"); // text color green
                if (!data.valid) {
                    modelMessage.textContent = "Model name must start with an uppercase letter or a number, and have a maximum of 30 characters";
                    modelMessage.classList.remove("text-success");
                    modelMessage.classList.add("text-danger");  // text color red
                }
            }
            if (!data.available) {
                modelMessage.textContent = "Model name already exists";
                modelMessage.classList.remove("text-success");
                modelMessage.classList.add("text-danger");  // text color red
            }


        } catch (err) {
            console.error(err);
            modelMessage.textContent = "Error checking name";
            modelMessage.style.color = "red";
        }
    }, 500); //500ms debounce

}