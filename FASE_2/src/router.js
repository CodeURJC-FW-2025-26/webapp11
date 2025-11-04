import express from 'express';

const router = express.Router();
export default router;

router.get('/', (req, res) => {
    
    res.render('index', {
        brands: [
            "Ferrari",
            "Lamborghini",
            "Mclaren",
            "Porsche",
            "Aston Martin",
            "BMW",
            "Audi",
            "Mercedes-Benz",
            "Rolls-Royce"
        ]
    });

});

