import express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';

import * as catalog from './catalog.js';

const router = express.Router();
export default router;

const upload = multer({ dest: catalog.UPLOADS_FOLDER })

// Main page, must obtain brands and pass them to template
router.get('/', async (req, res) => {

    let brandList = await catalog.getBrands();

    res.render('index', { posts: brandList });
});

// Brand creation page, must obtain form info and upload it to database
router.post('/brand/new', upload.single('image'), async (req, res) => {

    // By default, a brand has no models; these can be included later
    let brandEntity = {
        brand: req.body.brand,
        country: req.body.country,
        description: req.body.description,
        logos: req.file?.filename,
        models:[]
    };

    await catalog.addBrand(brandEntity);

    res.render('saved_brand', { _id: brandEntity._id.toString() });
});

// Specific brand page, must obtain ID through website path
router.get('/brand/:id', async (req, res) => {

    let brands = await catalog.getBrand(req.params.id);

    res.render('show_brand', { brands });
});

// Deleting a specific brand page, must obtain ID through website path
router.get('/brand/:id/delete', async (req, res) => {

    let brand = await catalog.deleteBrand(req.params.id);

    if (brand && brand.logos) {
        await fs.rm(catalog.UPLOADS_FOLDER + '/' + brand.logos);
    }

    res.render('deleted_brand');
});

// Showing a specific brand's logo, must obtain ID through website path
router.get('/brand/:id/image', async (req, res) => {

    let brands = await catalog.getBrand(req.params.id);

    res.download(catalog.UPLOADS_FOLDER + '/' + brands.logos);

});

