import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

function App() {
    const [image, setImage] = useState(null);
    const [file, setFile] = useState(null);
    const [version] = useState("v1.0.5");
    const [progress, setProgress] = useState("Upload not yet submitted");

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setImage(URL.createObjectURL(e.target.files[0]));
        }
    };

    const handleSubmit = async () => {
        if (!file) {
            setProgress("❌ No file selected");
            return;
        }

        setProgress("⏳ Analysing image...");

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("/api/analyse-image", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();
            console.log("✅ Response:", data);
            setProgress("✅ Analysis complete (check logs)");
        } catch (err) {
            console.error("❌ Error submitting:", err);
            setProgress("❌ Upload failed");
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>SIBI – Should I Buy It</h1>
            <p>Version: {version}</p>
            <input type="file" accept="image/*" onChange={handleImageChange} />
            {image && <img src={image} alt="Preview" style={{ width: '200px', marginTop: '20px' }} />}
            <div style={{ marginTop: '20px' }}>
                <button onClick={handleSubmit}>Start Analysis</button>
            </div>
            <div style={{ marginTop: '20px' }}>
                <p>Progress: {progress}</p>
            </div>
            <table border="1" cellPadding="10" style={{ marginTop: '20px' }}>
                <thead>
                    <tr><th>Item</th><th>Category</th><th>Value (AUD)</th><th>STR (%)</th><th>View Solds</th></tr>
                </thead>
                <tbody>
                    <tr><td colSpan="5">No results yet</td></tr>
                </tbody>
            </table>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
