import express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import * as catalog from './catalog.js';

const router = express.Router();
export default router;

const upload = multer({ dest: catalog.UPLOADS_FOLDER });

// ===================== MAIN PAGE WITH PAGINATION AND FILTERS FOR SEARCH AND COUNTRY =====================

router.get('/', async (req, res) => {

    let allBrands = await catalog.getBrands();

    const search = req.query.search || "";
    const country = req.query.country || "";

    // Filter by search term (case-insensitive)
    if (search) {
        allBrands = allBrands.filter(brandNameSearch =>
            brandNameSearch.brandName.toLowerCase().includes(search.toLowerCase())
        );
    }

    // Filter by country
    if (country) {
        allBrands = allBrands.filter(brandCountrySearch =>
            brandCountrySearch.country.toLowerCase() === country.toLowerCase()
        );
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = 6;
    const totalItems = allBrands.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;

    const brands = allBrands.slice(start, end);

    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
        pages.push({ number: i, isCurrent: i === page });
    }

    res.render('index', {
        brands,
        search,
        country,
        pages,
        hasPrev: page > 1,
        hasNext: page < totalPages,
        prevPage: page - 1,
        nextPage: page + 1
    });
});

// ===================== BRAND CREATION =====================

router.post('/brand/new', upload.single('image'), async (req, res) => {
    let brandEntity = {
        brandName: req.body.brandName,
        country: req.body.country,
        description: req.body.description,
        logo: req.file?.filename,
        models: []
    };

    await catalog.addBrand(brandEntity);

    res.render('saved_brand', { _id: result.insertedId.toString() });
    
});

// ===================== SPECIFIC BRAND PAGE =====================
router.get('/brand/:id', async (req, res) => {
    const brand = await catalog.getBrand(req.params.id);
    if (!brand) {
        return res.status(404).render('error', { message: "Brand not found" });
    }
    res.render('info', { brand });
});

// ===================== DELETE BRAND =====================
router.get('/brand/:id/delete', async (req, res) => {
    const brand = await catalog.deleteBrand(req.params.id);

    if (brand?.value?.logo) {
        await fs.rm(`${catalog.UPLOADS_FOLDER}/${brand.value.logo}`, { force: true });
    }

    res.render('deleted_brand');
});

// ===================== EDIT BRAND (FORM) =====================
router.get('/brand/:id/edit', async (req, res) => {
    const brand = await catalog.getBrand(req.params.id);
    if (!brand) {
        return res.status(404).render('error', { message: "Brand not found" });
    }
    res.render('edit_brand', { brand });
});

// ===================== UPDATE BRAND (FORM SUBMIT) =====================
router.post('/brand/:id/edit', upload.single('image'), async (req, res) => {
    const id = req.params.id;
    const oldBrand = await catalog.getBrand(id);
    if (!oldBrand) {
        return res.status(404).render('error', { message: "Brand not found" });
    }

    const updatedBrand = {
        brandName: req.body.brandName || oldBrand.brandName,
        country: req.body.country || oldBrand.country,
        description: req.body.description || oldBrand.description,
        logo: req.file ? req.file.filename : oldBrand.logo,
    };

    await catalog.updateBrand(id, updatedBrand);

    res.render('updated_brand', { brand: updatedBrand });
});

// ===================== SERVE BRAND LOGO =====================
router.get('/brand/:id/image', async (req, res) => {
    const brand = await catalog.getBrand(req.params.id);
    if (!brand || !brand.logo) {
        return res.status(404).send("Image not found");
    }
    console.log(brand.logo);
    res.download(`${catalog.UPLOADS_FOLDER}/${brand.logo}`);
});
/*
// ===================== SERVE MODEL IMAGE =====================
router.get('/brand/:id/model/:name/image', async (req, res) => {
    const modelImage = await catalog.getModelImage(req.params.brandId, req.params.name);
    if (!modelImage || !modelImage.image) {
        return res.status(404).send("Image not found");
    }
    console.log(modelImage.image);
    res.download(`${catalog.UPLOADS_FOLDER}/${modelImage.image}`);
}); */

