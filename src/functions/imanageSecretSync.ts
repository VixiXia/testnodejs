import { app, InvocationContext, Timer } from "@azure/functions";
import { secrets } from "../utils/azureSecrets";

type IManageSecretValue = {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token: string;
  obtained_at?: number;
};

export async function ImanageSecretSync(timer: Timer, context: InvocationContext): Promise<void> {
  const secret = await secrets.getSecret("ImanageAPISecret");
  const value = JSON.parse(secret.value) as IManageSecretValue;
  const urlencoded = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: value.refresh_token,
    client_id: process.env.IMANAGE_CLIENT_ID,
    client_secret: process.env.IMANAGE_CLIENT_SECRET
  });
  if (!value.obtained_at) {
    value.obtained_at = 17000000;
  }

  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: urlencoded
  };

  if (new Date() > new Date(value.obtained_at + (value.expires_in - 120) * 1000)) {
    const response = await fetch("https://microsoft.com/auth//oauth2/token", requestOptions);
    const result = await response.text();
    if (response.status !== 200) {
      throw Error(`${result}`);
    }

    const resultJson = JSON.parse(result) as IManageSecretValue;
    resultJson.obtained_at = new Date().getTime();
    const expireOn = new Date(resultJson.obtained_at + resultJson.expires_in * 1000);
    await secrets.setSecret("ImanageAPISecret", JSON.stringify(resultJson), {
      expiresOn: expireOn
    });
    context.log(`obtained imanage api token ${response.statusText}`);
    secrets.updateSecretProperties("ImanageAPISecret", secret.properties.version, { enabled: false });
  }
}

app.timer("ImanageSecretSync", {
  schedule: process.env.TIME_TRIGGER || "0 */5 * * * *",
  handler: ImanageSecretSync
});
