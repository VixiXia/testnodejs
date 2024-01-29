import { app, InvocationContext } from "@azure/functions";
import { EmailStatus, FileStorage } from "@prisma/client";
import prisma from "../utils/prismaClient";
import sgMail from "@sendgrid/mail";
import { decrypt, removeTempFile } from "../utils/helperFunctions";
import { queueEmail } from "../utils/azureStorageQueue";
import { downloadBlobToFile } from "../utils/storage"; // comment out this line to show on function app
import { Md5 } from "ts-md5";
import { TempFileDir } from "../env";
import { IManage } from "../utils/imanage"; // comment out this line to show on function app
import fs from "fs";

type FileQueue = {
  fileId: string;
  iMFolderId: string;
};
const imanage = new IManage(); // comment out this line to show on function app

export async function ImanageFileUpload(fileQueue: FileQueue, context: InvocationContext): Promise<void> {
  if (!fs.existsSync(TempFileDir)) {
    // Create the folder
    fs.mkdirSync(TempFileDir);
  }
  const file = await prisma.file.findUnique({
    where: {
      id: fileQueue.fileId
    }
  });

  const uniqueFilePath = Md5.hashStr(`${file.id}-${new Date()}`);
  const requestFileDir = `${TempFileDir}/${uniqueFilePath}`;
  if (!fs.existsSync(requestFileDir)) {
    fs.mkdirSync(requestFileDir);
  }
  const fileNameWithPath = `${requestFileDir}/${file.filename}`;

  const blobFileName = file.downloadLink.split("/").pop() as string;
  // const resp = await downloadBlobToFile(blobFileName, fileNameWithPath);
  // context.log(resp.status, fileNameWithPath);
  const fileExt = file.filename.split(".").pop();

  // const iMResponse = await imanage.upload(fileNameWithPath, file.fileSize, fileExt, file.filename, fileQueue.iMFolderId);
  // if (iMResponse.status === 201) {
  //   await prisma.file.update({
  //     where: { id: file.id },
  //     data: { documentId: iMResponse.data.id, downloadLink: iMResponse.data.id, fileStorage: FileStorage.IMANAGE }
  //   });
  // }
  removeTempFile(fileNameWithPath, 1);
}

app.storageQueue("ImanageFileUpload", {
  queueName: "taxct-file-queue",
  connection: "AzureWebJobsStorage",
  handler: ImanageFileUpload
});
