
"use server";

import { createAdminClient, createSessionClient } from "@/lib/appwrite";
import { InputFile } from "node-appwrite/file";
import { appwriteConfig } from "@/lib/appwrite/config";
import { ID, Permission, Query, Role } from "node-appwrite";
import {
  constructFileUrl,
  getFileType,
  parseStringify,
} from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/actions/user.actions";

const handleError = (error: unknown, message: string) => {
  console.error(message, error);
  throw error;
};

const createQueries = (
  currentUser: any,
  types: string[],
  searchText: string,
  sort: string,
  limit?: number,
) => {
  const queries: string[] = [
  Query.or([
    Query.equal("owner", [currentUser.$id]),
    Query.contains("users", [currentUser.email]),
  ]),
];

  if (types.length > 0) {
    queries.push(Query.equal("type", types));
  }

  if (searchText) {
    queries.push(Query.search("name", searchText));
  }

  if (limit) {
    queries.push(Query.limit(limit));
  }

  if (sort) {
    const [sortBy, orderBy] = sort.split("-");
    queries.push(
      orderBy === "asc"
        ? Query.orderAsc(sortBy)
        : Query.orderDesc(sortBy),
    );
  }

  return queries;
};

export const uploadFile = async ({
  file,
  ownerId,
  accountId,
  path,
}: UploadFileProps) => {
  const { storage, tablesDB } = await createAdminClient();

  try {
    const inputFile = InputFile.fromBuffer(file, file.name);

    
const bucketFile = await storage.createFile({
  bucketId: appwriteConfig.bucketId,
  fileId: ID.unique(),
  file: inputFile,
  permissions: [
    Permission.read(Role.user(ownerId)),
  ],
});


    const fileType = getFileType(bucketFile.name);

    try {
      const newFile = await tablesDB.createRow({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.filesCollectionId,
        rowId: ID.unique(),
        data: {
          type: fileType.type,
          name: bucketFile.name,
          url: constructFileUrl(bucketFile.$id),
          extension: fileType.extension,
          size: bucketFile.sizeOriginal,
          owner: ownerId,
          accountId,
          users: "",
          bucketFileId: bucketFile.$id,
        },
      });

      revalidatePath(path);
      return parseStringify(newFile);
    } catch (error) {
      await storage.deleteFile({
        bucketId: appwriteConfig.bucketId,
        fileId: bucketFile.$id,
      });
      throw error;
    }
  } catch (error) {
    handleError(error, "Failed to upload file");
  }
};

export const getFiles = async ({
  types = [],
  searchText = "",
  sort = "$createdAt-desc",
  limit,
}: GetFilesProps) => {
  const { tablesDB } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("User not found");

    const files = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.filesCollectionId,
      queries: createQueries(currentUser, types, searchText, sort, limit),
    });

    return parseStringify(files);
  } catch (error) {
    handleError(error, "Failed to get files");
  }
};

export const renameFile = async ({
  fileId,
  name,
  extension,
  path,
}: RenameFileProps) => {
  const { tablesDB } = await createAdminClient();

  try {
    const updatedFile = await tablesDB.updateRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.filesCollectionId,
      rowId: fileId,
      data: { name: `${name}.${extension}` },
    });

    revalidatePath(path);
    return parseStringify(updatedFile);
  } catch (error) {
    handleError(error, "Failed to rename file");
  }
};



export const updateFileUsers = async ({
  fileId,
  emails,
  path,
}: UpdateFileUsersProps) => {
  const { tablesDB, storage, users } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("User not authenticated");

    const fileRow = await tablesDB.getRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.filesCollectionId,
      rowId: fileId,
    });

    // Only the file owner may change sharing permissions.
    if (fileRow.owner !== currentUser.$id) {
      throw new Error("Only the file owner can change sharing");
    }

    const recipientIds: string[] = [];

    for (const email of emails) {
      const result = await users.list([], email.trim());

      const recipient = result.users.find(
        (user) => user.email.toLowerCase() === email.trim().toLowerCase()
      );

      if (!recipient) {
        throw new Error(`No account found for ${email}`);
      }

      recipientIds.push(recipient.$id);
    }

    const bucketFileId = fileRow.bucketFileId as string;

    // Keep the owner and grant read access to each recipient.
    const permissions = [
      Permission.read(Role.user(currentUser.$id)),
      ...recipientIds.map((id) => Permission.read(Role.user(id))),
    ];

    await storage.updateFile({
      bucketId: appwriteConfig.bucketId,
      fileId: bucketFileId,
      permissions,
    });

    const updatedFile = await tablesDB.updateRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.filesCollectionId,
      rowId: fileId,
      data: { users: emails.join(",") },
    });

    revalidatePath(path);
    return parseStringify(updatedFile);
  } catch (error) {
    handleError(error, "Failed to update file sharing");
  }
};

export const deleteFile = async ({
  fileId,
  bucketFileId,
  path,
}: DeleteFileProps) => {
  const { tablesDB, storage } = await createAdminClient();

  try {
    await tablesDB.deleteRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.filesCollectionId,
      rowId: fileId,
    });

    await storage.deleteFile({
      bucketId: appwriteConfig.bucketId,
      fileId: bucketFileId,
    });

    revalidatePath(path);
    return parseStringify({ status: "success" });
  } catch (error) {
    handleError(error, "Failed to delete file");
  }
};

export async function getTotalSpaceUsed() {
  try {
    const { tablesDB } = await createSessionClient();
    const currentUser = await getCurrentUser();

    if (!currentUser) throw new Error("User is not authenticated.");

    const files = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.filesCollectionId,
      queries: [Query.equal("owner", [currentUser.$id])],
    });

    const totalSpace = {
      image: { size: 0, latestDate: "" },
      document: { size: 0, latestDate: "" },
      video: { size: 0, latestDate: "" },
      audio: { size: 0, latestDate: "" },
      other: { size: 0, latestDate: "" },
      used: 0,
      all: 2 * 1024 * 1024 * 1024,
    };

    for (const file of files.rows) {
      const fileType = file.type as FileType;

      if (totalSpace[fileType]) {
        totalSpace[fileType].size += Number(file.size) || 0;
        totalSpace.used += Number(file.size) || 0;

        const updatedAt = file.$updatedAt ?? file.$createdAt;

        if (
          !totalSpace[fileType].latestDate ||
          new Date(updatedAt) >
            new Date(totalSpace[fileType].latestDate)
        ) {
          totalSpace[fileType].latestDate = updatedAt;
        }
      }
    }

    return parseStringify(totalSpace);
  } catch (error) {
    handleError(error, "Error calculating total space used");
  }
}
