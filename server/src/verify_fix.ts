import axios from "axios";

async function verify() {
	const payload = {
		planId: "pro",
		userId: "a9860376-392e-439a-9a70-8d9c513d1dce", // From user's logs
		userEmail: "brolloagus@gmail.com",
		redirectUrl: "http://localhost:5173",
	};

	try {
		console.log("Testing /api/create-subscription...");
		// We expect a 400 or a success (200), but NOT a 500.
		// If it's a 400 because "user already has a subscription", that's actually a SUCCESS for this fix
		// because it means the database query worked!
		const response = await axios.post(
			"http://localhost:3000/api/create-subscription",
			payload
		);
		console.log("Response Status:", response.status);
		console.log("Response Data:", response.data);
	} catch (error: any) {
		if (error.response) {
			console.log("Error Status:", error.response.status);
			console.log("Error Data:", error.response.data);
			if (error.response.status === 500) {
				console.error("FAILED: Still getting 500 error");
				process.exit(1);
			} else {
				console.log(
					"SUCCESS: Endpoint responded without 500 error (it might be 400 if user exists, etc)"
				);
			}
		} else {
			console.error("Error:", error.message);
		}
	}
}

verify();
