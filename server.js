const app = require('./app'); // Adjust the path as necessary

const PORT = process.env.PORT || 4628;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});