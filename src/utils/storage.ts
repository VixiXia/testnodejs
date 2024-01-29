import { HttpResponse } from "@azure/core-http";
import { BlobServiceClient, BlockBlobClient, ContainerClient, StorageSharedKeyCredential } from "@azure/storage-blob";

const connectionStringParts = `${process.env.AzureWebJobsStorage}`.split(";");
const account = connectionStringParts[1].replace("AccountName=", "");
const accountKey = connectionStringParts[2].replace("AccountKey=", "");
const containerName = "taxct-blob";

const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
const blobServiceClient = new BlobServiceClient(`https://${account}.blob.core.windows.net`, sharedKeyCredential);

const containerClient: ContainerClient = blobServiceClient.getContainerClient(containerName);

export async function downloadBlobToFile(blobName: string, fileNameWithPath: string): Promise<HttpResponse> {
  const blobClient = containerClient.getBlobClient(blobName);

  const res = await blobClient.downloadToFile(fileNameWithPath);
  return res._response;
}

export async function deleteBlob(blobName: string) {
  const blobClient = containerClient.getBlobClient(blobName);
  const res = await blobClient.deleteIfExists();
  return res._response;
}
