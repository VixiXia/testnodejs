import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential, AzureCliCredential } from "@azure/identity";
const credential = process.env.NODE_ENV === "local" ? new AzureCliCredential() : new DefaultAzureCredential();
const url = "https://" + process.env.AZURE_KEY_VAULT_NAME + ".vault.azure.net";
export const secrets = new SecretClient(url, credential);
