async function run() {
  try {
    const res = new Response("Internal server error", { status: 500 });
    await res.json();
  } catch (err) {
    console.log("Error message:", err.message);
  }
}
run();
