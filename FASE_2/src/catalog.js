import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';

const router = express.Router();
export default router;

const client = new MongoClient('mongodb://localhost:27017');

const db = client.db('catalog');
const brands = db.collection('brands');

export const UPLOADS_FOLDER = './uploads';

export async function addBrand(brand) {

    return await brands.insertOne(brand);
}

export async function deleteBrand(id) {

    return await brands.findOneAndDelete({ _id: new ObjectId(id) });
}

export async function deleteBrands() {

    return await brands.deleteMany();
}

export async function getBrands() {

    return await brands.find().toArray();
}

export async function getBrand(id) {

    return await brands.findOne({ _id: new ObjectId(id) });
}

export async function updateBrand(id, updatedBrand) {
    return await brands.updateOne({ _id: new ObjectId(id) }, { $set: updatedBrand });
}

export async function findModelByName(id, modelName) {
    return await brands.findOne(
        { _id: new ObjectId(id) },
        { projection: { models: { $elemMatch: { name: modelName } } } }
    );
}

export async function updateModel(id, oldName, model) {
    return await brands.updateOne(
        { _id: new ObjectId(id), 'models.name': oldName },
        { $set: { 'models.$': model } },
        { $set: { 'models.$.name': model.name } }
    );
}

export async function deleteModel(brandId, modelName) {
    return await brands.updateOne(
        { _id: new ObjectId(brandId) },
        { $pull: { models: { name: modelName } } }
    )
}