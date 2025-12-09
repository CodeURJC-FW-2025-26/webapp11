let brandDeletionWindow = document.querySelector("dialog");

let confirmButton = document.getElementById("confirmDeletionButton");
let cancelButton = document.getElementById("cancelDeletionButton");

let deleteBrandButton = document.querySelector("dialog + a");

function confirmBrandDeletion() {
    brandDeletionWindow.showModal();

    cancelButton.addEventListener("click", () => {
        brandDeletionWindow.close();
    })

    confirmButton.addEventListener("click", () => {
        // TO DO
    })
}