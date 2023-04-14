-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "PackageVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    CONSTRAINT "PackageVersion_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PackageEntrypoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entrypoint" TEXT NOT NULL,
    "filepath" TEXT,
    "versionId" TEXT NOT NULL,
    "type" TEXT,
    "minified" INTEGER,
    "unminified" INTEGER,
    "gzipMinified" INTEGER,
    "gzipUnminified" INTEGER,
    CONSTRAINT "PackageEntrypoint_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "PackageVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PackageExport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "entrypointId" TEXT NOT NULL,
    "minified" INTEGER,
    "unminified" INTEGER,
    "gzipMinified" INTEGER,
    "gzipUnminified" INTEGER,
    CONSTRAINT "PackageExport_entrypointId_fkey" FOREIGN KEY ("entrypointId") REFERENCES "PackageEntrypoint" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Package_name_key" ON "Package"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PackageVersion_packageId_version_key" ON "PackageVersion"("packageId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "PackageEntrypoint_versionId_entrypoint_key" ON "PackageEntrypoint"("versionId", "entrypoint");

-- CreateIndex
CREATE UNIQUE INDEX "PackageExport_entrypointId_identifier_key" ON "PackageExport"("entrypointId", "identifier");
