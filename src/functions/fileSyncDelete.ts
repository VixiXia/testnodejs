import { app, InvocationContext, Timer } from "@azure/functions";
import prisma from "../utils/prismaClient";
import { FileStorage } from "@prisma/client";
import { deleteBlob } from "../utils/storage";
import { IManage } from "../utils/imanage";

const imanage = new IManage();

export async function FileSyncDelete(timer: Timer, context: InvocationContext): Promise<void> {
  const fileStorageSync = await prisma.fileStorageSync.findMany({ where: { fileId: null } });
  for (const file of fileStorageSync) {
    try {
      if (file.fileStorage === FileStorage.IMANAGE) {
        await imanage.delete(file.documentId);
      } else {
        const blobFileName = file.downloadLink.split("/").pop() as string;
        await deleteBlob(blobFileName);
      }
      context.log(`file ${file.documentId} - ${file.fileId} done clean up from storage`);
    } catch (error) {
      context.log(`file ${file.documentId} - ${file.fileId} have problem with clean up from storage`);
      context.log(error);
    }
    await prisma.fileStorageSync.delete({ where: { id: file.id } });
  }
}

app.timer("FileSyncDelete", {
  schedule: process.env.TIME_TRIGGER || "0 * * * * *",
  handler: FileSyncDelete
});
