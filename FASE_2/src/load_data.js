import fs from 'node:fs/promises';
import * as catalog from './catalog.js';

const UPLOADS_FOLDER = './uploads';
const DATA_FOLDER = './data';

let dataFile = 'data.json';

// Obtain data from constant data path
const dataString = await fs.readFile(DATA_FOLDER + '/' + dataFile, 'utf8');

// Parse data in JSON format
const brands = JSON.parse(dataString);

// Delete whatever was in the database, then include demo brands with models
await catalog.deleteBrands();
for(let brand of brands){
    await catalog.addBrand(brand);
}

// Remake uploads folder and copy demo images
await fs.rm(UPLOADS_FOLDER, { recursive: true, force: true });
await fs.mkdir(UPLOADS_FOLDER);
await fs.cp(DATA_FOLDER + '/IMAGES', UPLOADS_FOLDER, { recursive: true });

console.log('Demo brands and models loaded');