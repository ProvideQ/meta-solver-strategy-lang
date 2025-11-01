import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import { RegisterRoutes } from './routes/routes.js';
import swaggerUi from 'swagger-ui-express';

const app = express();
export const port = 5000;

app.use('/swagger.json', express.static('spec/swagger.json'));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(undefined, { swaggerUrl: '/swagger.json' }));
app.get('/', (req, res) => res.redirect('/docs'));
app.use(bodyParser.json());
RegisterRoutes(app);

app.listen(port, () => {
    console.log(`MetaSolverStrategy server listening at http://localhost:${port}`);
});
