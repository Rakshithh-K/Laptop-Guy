import { useEffect, useState } from "react";
import axios from "axios";

function Inventory() {
    const [laptops, setLaptops] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLaptops();
    }, []);

    const fetchLaptops = async () => {
        try {
            const response = await axios.get(
                "https://name-laptop-billing-api.onrender.com/api/laptops"
            );

            setLaptops(response.data);
        } catch (error) {
            console.error("Failed to fetch laptops", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <p>Loading laptops...</p>;
    }

    return (
        <div>
            <h1>Laptop Inventory</h1>

            {laptops.length === 0 ? (
                <p>No laptops found.</p>
            ) : (
                laptops.map((laptop) => (
                    <div key={laptop._id}>
                        <h3>
                            {laptop.brand} {laptop.model}
                        </h3>

                        <p>Serial: {laptop.serialNumber}</p>
                        <p>Processor: {laptop.processor}</p>
                        <p>RAM: {laptop.ram}</p>
                        <p>Storage: {laptop.storage}</p>
                        <p>Price: ₹{laptop.sellingPrice}</p>
                        <p>Status: {laptop.status}</p>

                        <hr />
                    </div>
                ))
            )}
        </div>
    );
}

export default Inventory;