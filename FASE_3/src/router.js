import express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import * as catalog from './catalog.js';

const router = express.Router();
export default router;

const upload = multer({ dest: catalog.UPLOADS_FOLDER });

// ===================== MAIN PAGE WITH INFINITE SCROLL AND FILTERS FOR SEARCH AND COUNTRY ================
router.get('/', async (req, res) => {
    let allBrands = await catalog.getBrands();

    const search = req.query.search || "";
    const country = req.query.country || "";

    // Search filter
    if (search) {
        allBrands = allBrands.filter(brand =>
            brand.brandName.toLowerCase().includes(search.toLowerCase())
        );
    }
    // Country filter
    if (country) {
        allBrands = allBrands.filter(brand =>
            brand.country.toLowerCase() === country.toLowerCase()
        );
    }

    // Pagination logic
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = 6; // Number of items per page for infinite scroll 
    const totalItems = allBrands.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;

    const brandsSlice = allBrands.slice(start, end);

    // [NUEVO] AJAX: If client reqs JSON, response JSON
    if (req.query.format === 'json') {
        return res.json({
            brands: brandsSlice,
            hasMore: page < totalPages
        });
    }

    // Render HTML (First load)
    res.render('index', {
        brands: brandsSlice,
        search,
        country
        // No need to send pagination info for initial load
    });
});

// ===================== FORM PAGE: NEW BRAND =====================
router.get('/brand/new', (req, res) => {
    res.render('new_brand');
});

// ===================== BRAND CREATION =====================
router.post('/brand/new', upload.single('logo'), async (req, res) => {
    //Validations

    //Empty fields
    if (!req.body.brandName || !req.body.country || !req.body.description) {
        return res.status(400).render('error', { message: "Some fields are missing", link: "/brand/new", page: "New Brand" });
    }
    if (!req.file) {
        return res.status(400).render('error', { message: "You must upload a brand logo", link: "/brand/new", page: "New Brand" });
    }
    //Valid brand 
    if (!/^[A-ZÁÉÍÓÚÑ][a-zA-Z0-9\sáéíóúñÁÉÍÓÚÑ]{0,29}$/.test(req.body.brandName)) {
        return res.status(400).render('error', { message: "Brand name must start with an uppercase letter and have a maximum of 30 characters", link: "/brand/new", page: "New Brand" });
    }
    //Checks if the brand name already exists
    const existingBrand = await catalog.getBrandByName(req.body.brandName);
    if (existingBrand) {
        return res.status(400).render('error', { message: "Brand name already exists", link: "/brand/new", page: "New Brand" });
    }
    //Description lenght
    if (req.body.description.length < 10 || req.body.description.length > 300) {
        return res.status(400).render('error', { message: "Description must be between 10 and 300 characters", link: "/brand/new", page: "New Brand" });
    }
    //Country
    if (!/^[A-Za-zÁÉÍÓÚÑáéíóúñ\s]{2,60}$/.test(req.body.country)) {
        return res.status(400).render('error', { message: "Country must contain only letters and must be between 2 and 60 characters", link: "/brand/new", page: "New Brand" });
    }

    let brandEntity = {
        brandName: req.body.brandName,
        country: req.body.country,
        description: req.body.description,
        logo: req.file?.filename,
        models: []
    };

    const result = await catalog.addBrand(brandEntity);

    const brandId = result.insertedId;

    res.render('saved_brand', {
        brandName: brandEntity.brandName,
        country: brandEntity.country,
        description: brandEntity.description,
        id: brandId


    });
});

// Check brand name availability (AJAX)
router.get('/brand/check-name', async (req, res) => {
    const brandName = req.query.brandName;

    if (!brandName) return res.json({ available: false });

    const existingBrand = await catalog.getBrandByName(brandName);

    res.json({ available: !existingBrand });
});

// Check model name availability within a brand (AJAX)
router.get('/brand/:id/model/check-name', async (req, res) => {
    const modelName = req.query.modelName;
    const brandId = req.params.id;

    if (!modelName) return res.json({ available: false, valid: true });

    const existingModel = await catalog.findModelByName(brandId, modelName);

    const isAvailable = !(existingModel && existingModel.models && existingModel.models.length > 0);
    //Valid model name

    let isValid = true;
    if (!/^[A-Z0-9ÁÉÍÓÚÑ][a-zA-Z0-9\sáéíóúñÁÉÍÓÚÑ]{0,29}$/.test(modelName)) {
        isValid = false;
    }
    res.json({ available: isAvailable, valid: isValid });
});

// Check country format (AJAX)
router.get("/brand/check-country", (req, res) => {
    const { country } = req.query;

    if (!country) {
        return res.json({ valid: false, message: "" });
    }

    const startsWithUppercase = /^[A-ZÁÉÍÓÚÑ]/.test(country);
    const isValid = /^[A-ZÁÉÍÓÚÑ][a-zA-Z\sáéíóúñÁÉÍÓÚÑ]{1,59}$/.test(country);

    if (!startsWithUppercase) {
        return res.json({
            valid: false,
            message: "Country must start with an uppercase letter"
        });
    }

    if (!isValid) {
        return res.json({
            valid: false,
            message: "Country must contain only letters and be 2-60 characters long"
        });
    }

    return res.json({
        valid: true,
        message: "Country format is valid"
    });
});

// Check description length (AJAX)
router.get("/brand/check-description", (req, res) => {
    const { description } = req.query;

    if (!description) {
        return res.json({ valid: false, message: "" });
    }

    const len = description.trim().length;

    if (len >= 10 && len <= 300) {
        return res.json({ valid: true, message: "Description length is valid" });
    }

    res.json({ valid: false, message: "Description must be between 10 and 300 characters" });
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

    res.render('deleted_element', { element: 'Brand', link: '/' });
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
    //Validations, they are similar as the ones in create brand, but with a few changes.

    //Empty fields
    if (!req.body.brandName || !req.body.country || !req.body.description) {
        return res.status(400).render('error', { message: "Some fields are missing", link: `/brand/${id}/edit`, page: `Edit ${oldBrand.brandName}` });
    }
    //Valid brand 
    if (!/^[A-ZÁÉÍÓÚÑ][a-zA-Z0-9\sáéíóúñÁÉÍÓÚÑ]{0,29}$/.test(req.body.brandName)) {
        return res.status(400).render('error', { message: "Brand name must start with an uppercase letter and have a maximum of 30 characters", link: `/brand/${id}/edit`, page: `Edit ${oldBrand.brandName}` });
    }
    //Checks if the brand name already exists and its not old brand
    const existingBrand = await catalog.getBrandByName(req.body.brandName);
    if (existingBrand && existingBrand.id !== oldBrand.id) {
        return res.status(400).render('error', { message: "Brand name already exists", link: `/brand/${id}/edit`, page: `Edit ${oldBrand.brandName}` });
    }
    //Description lenght
    if (req.body.description.length < 10 || req.body.description.length > 300) {
        return res.status(400).render('error', { message: "Description must be between 10 and 300 characters", link: `/brand/${id}/edit`, page: `Edit ${oldBrand.brandName}` });
    }
    //Country
    if (!/^[A-Za-zÁÉÍÓÚÑáéíóúñ\s]{2,60}$/.test(req.body.country)) {
        return res.status(400).render('error', { message: "Country must contain only letters and must be between 2 and 60 characters", link: `/brand/${id}/edit`, page: `Edit ${oldBrand.brandName}` });
    }

    const updatedBrand = {
        brandName: req.body.brandName,
        country: req.body.country,
        description: req.body.description,
        logo: req.file ? req.file.filename : oldBrand.logo,
    };

    await catalog.updateBrand(id, updatedBrand);

    res.render('updated_element', { element: 'Brand', link: '/' });
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
    const modelImage = modelObject.models[0].image;
    if (!modelObject || !modelImage) {
        return res.status(404).send("Image not found");
    }
    res.download(`${catalog.UPLOADS_FOLDER}/${modelImage}`);
});

// ===================== EDIT MODEL PAGE =====================
router.get('/brand/:id/model/:name/edit', async (req, res) => {
    const modelObject = await catalog.findModelByName(req.params.id, req.params.name);
    const brandId = modelObject._id;
    const model = modelObject.models[0];
    res.render('edit_model', { id: brandId, model: model });
});

// ===================== DATABASE MODEL EDIT REQUEST =====================
router.post('/brand/:id/model/:name/edit', upload.single('image'), async (req, res) => {
    const brandId = req.params.id;
    const oldModelName = req.params.name;
    const oldModelObject = await catalog.findModelByName(brandId, oldModelName);
    if (!oldModelObject) {
        res.status(404).render('error', { message: 'Model not found' });
    }
    const sentFormInfo = req.body;
    const date = new Date();

    const updatedModelObject = {
        name: sentFormInfo.modelName || oldModelObject.name,
        HP: sentFormInfo.HP || oldModelObject.HP,
        year: sentFormInfo.year || oldModelObject.year,
        daily_price: sentFormInfo.daily_price || oldModelObject.daily_price,
        image: req.file ? req.file.filename : oldModelObject.models[0].image,
        technical_specifications: sentFormInfo.technical_specifications || oldModelObject.technical_specifications,
        rental_conditions: sentFormInfo.rental_conditions || oldModelObject.rental_conditions,
        interesting_facts: sentFormInfo.interesting_facts || oldModelObject.interesting_facts
    };




    //Validations for model edition

    //Empty fields
    if (!updatedModelObject.name || !updatedModelObject.HP || !updatedModelObject.year || !updatedModelObject.daily_price || !updatedModelObject.technical_specifications || !updatedModelObject.rental_conditions || !updatedModelObject.interesting_facts) {
        return res.status(400).render('error', { message: "Some fields are missing", link: `/brand/${brandId}/model/${oldModelName}/edit`, page: `Edit ${oldModelName}` });
    }
    if (!updatedModelObject.image) {
        return res.status(400).render('error', { message: "You must upload a model image", link: `/brand/${brandId}/model/${oldModelName}/edit`, page: `Edit ${oldModelName}` });
    }
    //Valid model name
    if (!/^[A-Z0-9ÁÉÍÓÚÑ][a-zA-Z0-9\sáéíóúñÁÉÍÓÚÑ]{0,29}$/.test(updatedModelObject.name)) {
        return res.status(400).render('error', { message: "Model name must start with an uppercase letter and have a maximum of 30 characters", link: `/brand/${brandId}/model/${oldModelName}/edit`, page: `Edit ${oldModelName}` });
    }
    //Checks if the model name already exists
    const existingModel = await catalog.findModelByName(brandId, oldModelObject.name);
    if (existingModel.models) {
        return res.status(400).render('error', { message: "Model name already exists", link: `/brand/${brandId}/model/${oldModelName}/edit`, page: `Edit ${oldModelName}` });
    }
    //Year
    if (updatedModelObject.year < 1850 || updatedModelObject.year > (date.getFullYear() + 1)) {
        return res.status(400).render('error', { message: "Year must be between 1850 and current year", link: `/brand/${brandId}/model/${oldModelName}/edit`, page: `Edit ${oldModelName}` });
    }
    if (!/^[0-9]+$/.test(updatedModelObject.year)) {
        return res.status(400).render('error', { message: "Year must only contain numbers", link: `/brand/${brandId}/model/${oldModelName}/edit`, page: `Edit ${oldModelName}` });
    }
    //HP
    if (updatedModelObject.HP > 10000) {
        return res.status(400).render('error', { message: "HP must be lower than 10000", link: `/brand/${brandId}/model/${oldModelName}/edit`, page: `Edit ${oldModelName}` });
    }
    if (!/^[0-9]+$/.test(updatedModelObject.HP)) {
        return res.status(400).render('error', { message: "HP must only contain numbers", link: `/brand/${brandId}/model/${oldModelName}/edit`, page: `Edit ${oldModelName}` });
    }
    //Daily Price
    if (updatedModelObject.daily_price > 1000000) {
        return res.status(400).render('error', { message: "Daily price must be lower than 1 000 000", link: `/brand/${brandId}/model/${oldModelName}/edit`, page: `Edit ${oldModelName}` });
    }
    if (!/^[0-9]+$/.test(updatedModelObject.daily_price)) {
        return res.status(400).render('error', { message: "Daily price must only contain numbers", link: `/brand/${brandId}/model/${oldModelName}/edit`, page: `Edit ${oldModelName}` });
    }

    //Technical Specifications
    if (updatedModelObject.technical_specifications.length < 10 || updatedModelObject.technical_specifications.length > 300) {
        return res.status(400).render('error', { message: "Technical Specifications must be between 10 and 300 characters", link: `/brand/${brandId}/model/${oldModelName}/edit`, page: `Edit ${oldModelName}` });
    }
    //Rental conditions
    if (updatedModelObject.rental_conditions.length < 10 || updatedModelObject.rental_conditions.length > 300) {
        return res.status(400).render('error', { message: "Rental conditions must be between 10 and 300 characters", link: `/brand/${brandId}/model/${oldModelName}/edit`, page: `Edit ${oldModelName}` });
    }
    //Interesting facts
    if (updatedModelObject.interesting_facts.length < 10 || updatedModelObject.interesting_facts.length > 300) {
        return res.status(400).render('error', { message: "Interesting Facts must be between 10 and 300 characters", link: `/brand/${brandId}/model/${oldModelName}/edit`, page: `Edit ${oldModelName}` });
    }


    await catalog.updateModel(brandId, oldModelName, updatedModelObject);

    res.render('updated_element', { element: 'Model', link: `/brand/${brandId}` });
});

// ===================== MODEL DELETION REQUEST =====================
router.get('/brand/:id/model/:name/delete', async (req, res) => {
    const modelObject = await catalog.deleteModel(req.params.id, req.params.name);
    const modelObjectImage = modelObject?.value?.image

    if (modelObjectImage) {
        await fs.rm(`${catalog.UPLOADS_FOLDER}/${modelObjectImage}`, { force: true });
    }

    res.render('deleted_element', { element: 'Model', link: `/brand/${req.params.id}` });
});

// ===================== DATABASE MODEL ADDITION REQUEST =====================
router.post('/brand/:id/model/create', upload.single('image'), async (req, res) => {
    const brandId = req.params.id;
    const sentFormInfo = req.body;
    const date = new Date();
    const brand = await catalog.getBrand(brandId);
    if (!brand) {
        return res.status(404).render('error', { message: "Brand not found" });
    }

    //Validations for model addition

    //Empty fields
    if (!sentFormInfo.modelName || !sentFormInfo.HP || !sentFormInfo.year || !sentFormInfo.daily_price || !sentFormInfo.technical_specifications || !sentFormInfo.rental_conditions || !sentFormInfo.interesting_facts) {
        return res.status(400).render('error', { message: "Some fields are missing", link: `/brand/${brandId}`, page: `${brand.brandName}` });
    }
    if (!req.file) {
        return res.status(400).render('error', { message: "You must upload a model image", link: `/brand/${brandId}`, page: `${brand.brandName}` });
    }
    //Valid model name
    if (!/^[A-Z0-9ÁÉÍÓÚÑ][a-zA-Z0-9\sáéíóúñÁÉÍÓÚÑ]{0,29}$/.test(sentFormInfo.modelName)) {
        return res.status(400).render('error', { message: "Model name must start with an uppercase letter or a number, and have a maximum of 30 characters", link: `/brand/${brandId}`, page: `${brand.brandName}` });
    }
    //Checks if the model name already exists
    const existingModel = await catalog.findModelByName(brandId, sentFormInfo.modelName);
    if (existingModel.models) {
        return res.status(400).render('error', { message: "Model name already exists", link: `/brand/${brandId}`, page: `${brand.brandName}` });
    }
    //Year
    if (sentFormInfo.year < 1850 || sentFormInfo.year > (date.getFullYear() + 1)) {
        return res.status(400).render('error', { message: "Year must be between 1850 and current year", link: `/brand/${brandId}`, page: `${brand.brandName}` });
    }
    if (!/^[0-9]+$/.test(sentFormInfo.year)) {
        return res.status(400).render('error', { message: "Year must only contain numbers", link: `/brand/${brandId}`, page: `${brand.brandName}` });
    }
    //HP
    if (sentFormInfo.HP > 10000) {
        return res.status(400).render('error', { message: "HP must be lower than 10000", link: `/brand/${brandId}`, page: `${brand.brandName}` });
    }
    if (!/^[0-9]+$/.test(sentFormInfo.HP)) {
        return res.status(400).render('error', { message: "HP must only contain numbers", link: `/brand/${brandId}`, page: `${brand.brandName}` });
    }
    //Daily Price
    if (sentFormInfo.daily_price > 1000000) {
        return res.status(400).render('error', { message: "Daily price must be lower than 1 000 000", link: `/brand/${brandId}`, page: `${brand.brandName}` });
    }
    if (!/^[0-9]+$/.test(sentFormInfo.daily_price)) {
        return res.status(400).render('error', { message: "Daily price must only contain numbers", link: `/brand/${brandId}`, page: `${brand.brandName}` });
    }

    //Technical Specifications
    if (sentFormInfo.technical_specifications.length < 10 || sentFormInfo.technical_specifications.length > 300) {
        return res.status(400).render('error', { message: "Technical Specifications must be between 10 and 300 characters", link: `/brand/${brandId}`, page: `${brand.brandName}` });
    }
    //Rental conditions
    if (sentFormInfo.rental_conditions.length < 10 || sentFormInfo.rental_conditions.length > 300) {
        return res.status(400).render('error', { message: "Rental conditions must be between 10 and 300 characters", link: `/brand/${brandId}`, page: `${brand.brandName}` });
    }
    //Interesting facts
    if (sentFormInfo.interesting_facts.length < 10 || sentFormInfo.interesting_facts.length > 300) {
        return res.status(400).render('error', { message: "Interesting Facts must be between 10 and 300 characters", link: `/brand/${brandId}`, page: `${brand.brandName}` });
    }


    const newModelObject = {
        name: sentFormInfo.modelName,
        HP: sentFormInfo.HP,
        year: sentFormInfo.year,
        daily_price: sentFormInfo.daily_price,
        image: req.file.filename,
        technical_specifications: sentFormInfo.technical_specifications,
        rental_conditions: sentFormInfo.rental_conditions,
        interesting_facts: sentFormInfo.interesting_facts
    };

    const modelInDatabase = await catalog.findModelByName(brandId, newModelObject.name);

    const modelExists = modelInDatabase.models;

    if (modelExists) {
        res.status(404).render('error', { message: 'Model already exists for this brand. Edit that one instead.' });
    }

    await catalog.addModel(brandId, newModelObject);

    res.render('saved_model', { element: newModelObject, link: `/brand/${brandId}` });
});

