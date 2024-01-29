import { secrets } from "./azureSecrets";
import fs from "fs";
import axios, { AxiosResponse } from "axios";
import FormData from "form-data";
import { Md5 } from "ts-md5";
import { removeTempFile } from "./helperFunctions";
import { TempFileDir } from "../env";

type IManageSecretValue = {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token: string;
  obtained_at?: number;
};

type IManageUploadResponse = {
  data: {
    database: string;
    document_number: number;
    version: number;
    name: string;
    author: string;
    operator: string;
    type: string;
    class: string;
    edit_date: string;
    create_date: string;
    retain_days: number;
    size: number;
    is_declared: false;
    declared: false;
    extension: string;
    edit_profile_date: string;
    is_external: false;
    is_external_as_normal: false;
    file_create_date: string;
    file_edit_date: string;
    is_hipaa: false;
    workspace_name: string;
    id: string;
    in_use: false;
    indexable: false;
    workspace_id: string;
  };
  warnings: [];
};

export class IManage {
  public async tokenFromVault() {
    const secret = await secrets.getSecret("ImanageAPISecret");
    if (secret.value) {
      const token = JSON.parse(secret.value) as IManageSecretValue;
      return token;
    } else {
      throw Error(`unable to obtain imanage secret from vault`);
    }
  }

  public async upload(filePath: string, fileSize: number, fileExt: string | undefined, fileName: string, iMFolderId: string) {
    const token = await this.tokenFromVault();

    const profileContent = JSON.stringify({
      warnings_for_required_and_disabled_fields: true,
      doc_profile: {
        name: fileName.replace(`.${fileExt}`, ""),
        extension: fileExt,
        file_edit_date: new Date().toISOString(),
        file_create_date: new Date().toISOString(),
        size: fileSize
      }
    });
    const profilePath = `${TempFileDir}/${Md5.hashStr(profileContent)}.json`;
    fs.writeFileSync(profilePath, profileContent);
    const data = new FormData();
    data.append("profile", fs.createReadStream(profilePath));
    data.append("file", fs.createReadStream(filePath));

    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url: `https://microsoft.com/ACTIVE/folders/${iMFolderId}/documents`,
      headers: {
        "X-Auth-Token": token.access_token,
        "content-type": "multipart/form-data; boundary=---",
        ...data.getHeaders()
      },
      data: data
    };
    let response: AxiosResponse<any, any>;
    response = await axios.request(config);
    removeTempFile(profilePath, 1);
    return { ...(response.data as IManageUploadResponse), status: response.status };
  }

  /**
   * get version history from imanage for document
   * @param documentId imanage file id
   **/
  public async getVersionHistory(documentId: string) {
    const token = await this.tokenFromVault();

    const myHeaders = new Headers();
    myHeaders.append("X-Auth-Token", token.access_token);
    const requestOptions = {
      method: "GET",
      headers: myHeaders
    };

    const response = await fetch(`https://microsoft.com/ACTIVE/documents/${documentId}/history/versions`, requestOptions);

    const resultJson = await response.json();
    return resultJson as { data: { version: number; id: string; extension: string; size: number; name: string }[] };
  }

  /**
   * delete file from imanage
   * @param documentId imanage file id
   **/
  public async delete(documentId: string) {
    const token = await this.tokenFromVault();

    const myHeaders = new Headers();
    myHeaders.append("X-Auth-Token", token.access_token);
    const requestOptions = {
      method: "DELETE",
      headers: myHeaders
    };
    const responses: Response[] = [];
    const allVersions = this.getVersionHistory(documentId);
    for (const docVersion of (await allVersions).data) {
      const response = await fetch(`https://microsoft.com/ACTIVE/documents/${docVersion.id}`, requestOptions);
      if (response.status === 200) {
        responses.push(response);
      }
    }
    return responses;
  }
}
