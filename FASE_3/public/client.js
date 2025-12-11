// ===================== State vars =====================
let page = 1;
let loading = false;
let hasMore = true;

// ===================== INITIALIZING =====================
document.addEventListener("DOMContentLoaded", () => {

    // 1. Configure Infinite Scroll
    window.addEventListener('scroll', handleScroll);

    // 2. Configure Delete Modal
    setupDeleteModal();
});

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
// Wait for DOM to load before setting up modal
document.addEventListener("DOMContentLoaded", () => {
    setupDeleteModal();
});

function setupDeleteModal() {
    // 1. Search for the dialog element in the page
    let brandDeletionWindow = document.querySelector("dialog");

    // If the dialog doesn't exist, exit
    if (!brandDeletionWindow) return;

    // 2. Get buttons inside the dialog
    let confirmButton = document.getElementById("confirmDeletionButton");
    let cancelButton = document.getElementById("cancelDeletionButton");

    // querySelector to find the delete button on the main page
    // (assumes there's only one delete button per page)
    let deleteBrandButton = document.querySelector(".btn-outline-danger");

    // 3. Setup delete button to open modal on click
    if (deleteBrandButton) {
        deleteBrandButton.addEventListener("click", (e) => {
            e.preventDefault(); // Prevent default link behavior
            brandDeletionWindow.showModal();
        });
    }

    // 4. Setup cancel button to close modal
    if (cancelButton) {
        cancelButton.addEventListener("click", () => {
            brandDeletionWindow.close();
        });
    }

    // 5. Setup confirm button to handle deletion 
    if (confirmButton) {
        confirmButton.addEventListener("click", () => {
            console.log("Confirmado: Borrando marca...");

            // Aquí pondrás tu fetch() más adelante
        });
    }
}

// ===================== BRAND INFO VALIDATION =====================
let debounceTimer;

async function checkBrandNameAvailability() {
    const brandInput = document.getElementById("brand");
    const brandMessage = document.getElementById("brandMessage");
    const brandName = brandInput.value.trim();

    // If it is empty, clear message
    if (!brandName) {
        brandMessage.textContent = "";
        return;
    }

    //Clear last requests
    clearTimeout(debounceTimer);

    // Wait 500ms after user stops typing
    debounceTimer = setTimeout(async () => {
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