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

// ===================== FORM PAGE: NEW BRAND =====================
router.get('/brand/new', (req, res) => {
    res.render('new_brand');
});

// ===================== BRAND CREATION =====================
router.post('/brand/new', upload.single('logo'), async (req, res) => {
    let brandEntity = {
        brandName: req.body.brandName,
        country: req.body.country,
        description: req.body.description,
        logo: req.file?.filename,
        models: []
    };

    const result = await catalog.addBrand(brandEntity);

    res.render('saved_brand', {
        brandName: brandEntity.brandName,
        country: brandEntity.country,
        description: brandEntity.description
    });
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

    res.render('updated_element', { element : 'Brand', link: '/' });
});

// ===================== SERVE BRAND LOGO =====================
router.get('/brand/:id/image', async (req, res) => {
    const brand = await catalog.getBrand(req.params.id);
    if (!brand || !brand.logo) {
        return res.status(404).send("Image not found");
    }
    res.download(`${catalog.UPLOADS_FOLDER}/${brand.logo}`);
});

// ===================== SERVE MODEL IMAGE =====================
router.get('/brand/:id/model/:name/image', async (req, res) => {
    const modelObject = await catalog.findModelByName(req.params.id, req.params.name);
    const imagenModelo = modelObject.models[0].image;
    if (!modelObject || !imagenModelo) {
        return res.status(404).send("Image not found");
    }
    res.download(`${catalog.UPLOADS_FOLDER}/${imagenModelo}`);
});

// ===================== EDIT MODEL INFO =====================
router.get('/brand/:id/model/:name/edit', async (req, res) => {
    const modelObject = await catalog.findModelByName(req.params.id, req.params.name);
    const brandId = modelObject._id;
    const model = modelObject.models[0];
    res.render('edit_model', { id: brandId, model: model });
});

router.post('/brand/:id/model/:name/edit', upload.single('image'), async (req, res) => {
    const brandId = req.params.id;
    const oldModelName = req.params.name;
    const oldModelObject = await catalog.findModelByName(brandId, oldModelName);
    if (!oldModelObject) {
        res.status(404).render('error', { message: 'Model not found' });
    }

    const sentModel = req.body;

    const updatedModelObject = {
        name : sentModel.modelName || oldModelObject.name,
        HP : sentModel.HP || oldModelObject.HP,
        year : sentModel.year || oldModelObject.year,
        daily_price : sentModel.daily_price || oldModelObject.daily_price,
        image : req.file ? req.file.filename : oldModelObject.models[0].image,
        technical_specifications : sentModel.technical_specifications || oldModelObject.technical_specifications,
        rental_conditions : sentModel.technical_specifications || oldModelObject.rental_conditions,
        interesting_facts : sentModel.interesting_facts || oldModelObject.interesting_facts
    };

    console.log(updatedModelObject);
    await catalog.updateModel(brandId, oldModelName, updatedModelObject);

    res.render('updated_element', {element : 'Model', link : `/brand/${brandId}`});
});