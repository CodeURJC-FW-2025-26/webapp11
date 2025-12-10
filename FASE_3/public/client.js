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
// Wait for DOM to load before setting up buttons to load modals
document.addEventListener("DOMContentLoaded", () => {

    let deleteBrandButton = document.getElementById("brandDeletionButton");

    if (deleteBrandButton) {
        deleteBrandButton.addEventListener("click", () => {
            confirmBrandDeletion();
        });
    }
});

function confirmBrandDeletion() {
    // Search of elements of the respective dialog (If the dialog pop-up itself does not exist, exit)
    let brandDeletionWindow = document.getElementById("deleteBrandModal");
    if (!brandDeletionWindow) return; 
    let confirmButton = document.getElementById("confirmDeletionButton");
    let cancelButton = document.getElementById("cancelDeletionButton");

    // Display of the pop-up dialog
    brandDeletionWindow.showModal();

    // Button handling inside the pop-up (cancelButton closes the window, but Esc key or clicking outside is also allowed)
    if (cancelButton) {
        cancelButton.addEventListener("click", () => {
            brandDeletionWindow.close();
        });
    }
    if (confirmButton) {
        confirmButton.addEventListener("click", () => {
            console.log("Confirmado: Borrando marca...");
            
            // Aquí pondrás tu fetch() más adelante
        });
    }
}