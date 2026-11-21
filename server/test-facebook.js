
require("dotenv").config();

async function testFacebookConnection() {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const version = process.env.META_GRAPH_API_VERSION || "v27.0";

  if (!pageId || !accessToken) {
    throw new Error(
      "Facebook Page ID or Page access token is missing from .env"
    );
  }

  console.log("Checking Facebook Page connection...");

  const url = new URL(
    `https://graph.facebook.com/${version}/${pageId}`
  );

  url.searchParams.set("fields", "id,name");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message || "Facebook connection failed."
    );
  }

  if (data.id !== pageId) {
    throw new Error("The returned Page ID does not match your configured Page ID.");
  }

  console.log("\nFACEBOOK CONNECTION SUCCESSFUL!");
  console.log("Page name:", data.name);
  console.log("Page ID:", data.id);
}

testFacebookConnection().catch((error) => {
  console.error("\nFACEBOOK CONNECTION FAILED:");
  console.error(error.message);
});
