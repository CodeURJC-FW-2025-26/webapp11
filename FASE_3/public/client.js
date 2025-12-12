// ===================== State vars =====================
let page = 1;
let loading = false;
let hasMore = true;

// ===================== INITIALIZING =====================
document.addEventListener("DOMContentLoaded", () => {

    // [NUEVO] 1. Resaltar el botón del país activo
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
    // Si estamos cargando datos reales, no hacemos nada
    if (loading) return;

    const bottomSpinner = document.getElementById('infinite-scroll-spinner');

    // Detectamos si estamos al final de la página
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 50) {

        if (hasMore) {
            // ESCENARIO A: Aún quedan coches en la base de datos
            loadNextPage();
        } else {
            // ESCENARIO B: Ya no quedan coches (hemos visto la bandera)
            // Si el usuario insiste en bajar, mostramos el spinner girando infinitamente
            if (bottomSpinner) bottomSpinner.classList.remove('d-none');
        }
    }
}

function loadNextPage() {
    loading = true;

    const bottomSpinner = document.getElementById('infinite-scroll-spinner');
    const finishMsg = document.getElementById('finish-line-msg');

    // UI: Mostrar spinner, ocultar meta (por si acaso)
    if (bottomSpinner) bottomSpinner.classList.remove('d-none');
    if (finishMsg) finishMsg.classList.add('d-none');

    const params = new URLSearchParams(window.location.search);
    const search = params.get('search') || '';
    const country = params.get('country') || '';

    page++;

    // Promesa A: Petición
    const dataFetch = fetch(`/?page=${page}&search=${search}&country=${country}&format=json`)
        .then(response => {
            if (!response.ok) throw new Error("Error loading data");
            return response.json();
        });

    // Promesa B: Retardo (0.8s)
    const minDelay = new Promise(resolve => setTimeout(resolve, 800));

    Promise.all([dataFetch, minDelay])
        .then(([data, _]) => {

            if (data.brands && data.brands.length > 0) {
                renderNewBrands(data.brands);
            }

            // Actualizamos si quedan más
            hasMore = data.hasMore; // Si es undefined o false, se marca como false

            if (!hasMore) {
                // FIN DEL CONTENIDO
                // 1. Mostramos la bandera
                if (finishMsg) finishMsg.classList.remove('d-none');

                // 2. IMPORTANTE: Ocultamos el spinner temporalmente.
                // Si el usuario deja de hacer scroll, verá solo la bandera.
                // Si SIGUE haciendo scroll, 'handleScroll' se activará de nuevo y mostrará el spinner abajo.
                if (bottomSpinner) bottomSpinner.classList.add('d-none');
            }
        })
        .catch(err => {
            console.error("Error:", err);
            page--;
            // Si hay error, ocultamos spinner
            if (bottomSpinner) bottomSpinner.classList.add('d-none');
        })
        .finally(() => {
            // Solo liberamos el flag de loading para permitir nuevos eventos
            loading = false;

            // NOTA: En el 'finally' normal ocultaríamos el spinner, 
            // pero aquí lo gestionamos dentro del 'then' para soportar el caso "sin datos".
            // Solo lo ocultamos si NO hemos llegado al final o si hubo error.
            if (hasMore && bottomSpinner) {
                bottomSpinner.classList.add('d-none');
            }
        });
}

function renderNewBrands(brands) {
    const container = document.getElementById('brands-container');

    brands.forEach(brand => {
        // Generate HTML. Important: ` ` (backticks)
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
        // Button pressed is any of the model deletion buttons
        if (event.target.classList.contains("deleteModelButton")) {
            let modelName = obtainModelName(event.target);
            let response = await deleteModel(modelName, brandid);
            if (response.status === 200) {
                document.getElementById(modelName).remove();
            }
            else {
                showErrorWindow(dialog, response);
            }
        }
        // Button pressed is the brand deletion button
        else if (event.target.id === "brandDeletionButton") {
            confirmBrandDeletion(dialog, brandid);
        }
    })

    // ------------------------------------------------------
    // MORE BUTTONS THAT NEED TO USE THE DIALOG MODEL GO HERE
    // ------------------------------------------------------
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

function obtainModelName(target) {
    return target.getAttribute("data-modelname");
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
let debounceTimerBrand;
let debounceTimerModel;

async function checkBrandNameAvailability() {
    const brandInput = document.getElementById("brand");
    const brandMessage = document.getElementById("brandMessage");
    const brandName = brandInput.value.trim();

    // If it is empty, clear message
    if (!brandName) {
        brandMessage.textContent = "";
        return;
    }

    // Clear last requests for brand input
    clearTimeout(debounceTimerBrand);

    // Wait 500ms after user stops typing
    debounceTimerBrand = setTimeout(async () => {
        try {
            const response = await fetch(`/brand/check-name?brandName=${encodeURIComponent(brandName)}`);
            const data = await response.json();

            if (data.available) {
                brandMessage.textContent = "Brand name available";
                brandMessage.classList.remove("text-danger");
                brandMessage.classList.add("text-success"); // text color green
            } else {
                brandMessage.textContent = "Brand name already exists";
                brandMessage.classList.remove("text-success");
                brandMessage.classList.add("text-danger");  // text color red
            }
        } catch (err) {
            console.error(err);
            brandMessage.textContent = "Error checking name";
            brandMessage.style.color = "red";
        }
    }, 500); //500ms debounce
}

// ===================== NEW MODEL INFO VALIDATION =====================


async function checkModelNameAvailability() {
    const modelInput = document.getElementById("model");
    const modelMessage = document.getElementById("modelMessage");
    if (!modelInput || !modelMessage) return;
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
            } else {
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