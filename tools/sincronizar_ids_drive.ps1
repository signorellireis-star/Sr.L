# Extrai automaticamente os 121 IDs do Google Drive Desktop e atualiza data/sets-data.json
$ErrorActionPreference = 'Stop'

$sourceDir = "$env:LOCALAPPDATA\Google\DriveFS\108460526871111724191"
$tempDir = Join-Path $env:TEMP "gdrive_db_sync"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir | Out-Null

foreach ($f in "metadata_sqlite_db", "metadata_sqlite_db-wal", "metadata_sqlite_db-shm") {
  $src = Join-Path $sourceDir $f
  if (Test-Path $src) {
    $dst = Join-Path $tempDir ($f -replace "metadata_sqlite_db", "meta.db")
    $fsSrc = [System.IO.FileStream]::new($src, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
    $fsDst = [System.IO.FileStream]::new($dst, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
    $fsSrc.CopyTo($fsDst)
    $fsSrc.Close()
    $fsDst.Close()
  }
}

$csharp = @"
using System;
using System.Runtime.InteropServices;
using System.Collections.Generic;

public class WinSqliteSync {
    [DllImport("winsqlite3.dll", EntryPoint = "sqlite3_open16", CharSet = CharSet.Unicode, CallingConvention = CallingConvention.Cdecl)]
    public static extern int sqlite3_open16(string filename, out IntPtr db);

    [DllImport("winsqlite3.dll", EntryPoint = "sqlite3_close", CallingConvention = CallingConvention.Cdecl)]
    public static extern int sqlite3_close(IntPtr db);

    [DllImport("winsqlite3.dll", EntryPoint = "sqlite3_prepare16_v2", CharSet = CharSet.Unicode, CallingConvention = CallingConvention.Cdecl)]
    public static extern int sqlite3_prepare16_v2(IntPtr db, string zSql, int nByte, out IntPtr ppStmt, IntPtr pzTail);

    [DllImport("winsqlite3.dll", EntryPoint = "sqlite3_step", CallingConvention = CallingConvention.Cdecl)]
    public static extern int sqlite3_step(IntPtr pStmt);

    [DllImport("winsqlite3.dll", EntryPoint = "sqlite3_finalize", CallingConvention = CallingConvention.Cdecl)]
    public static extern int sqlite3_finalize(IntPtr pStmt);

    [DllImport("winsqlite3.dll", EntryPoint = "sqlite3_column_count", CallingConvention = CallingConvention.Cdecl)]
    public static extern int sqlite3_column_count(IntPtr pStmt);

    [DllImport("winsqlite3.dll", EntryPoint = "sqlite3_column_name16", CallingConvention = CallingConvention.Cdecl)]
    public static extern IntPtr sqlite3_column_name16(IntPtr pStmt, int N);

    [DllImport("winsqlite3.dll", EntryPoint = "sqlite3_column_text16", CallingConvention = CallingConvention.Cdecl)]
    public static extern IntPtr sqlite3_column_text16(IntPtr pStmt, int iCol);

    public static List<Dictionary<string, string>> Query(string dbPath, string sql) {
        var results = new List<Dictionary<string, string>>();
        IntPtr db;
        int rc = sqlite3_open16(dbPath, out db);
        if (rc != 0) throw new Exception("open error " + rc);
        try {
            IntPtr stmt;
            rc = sqlite3_prepare16_v2(db, sql, -1, out stmt, IntPtr.Zero);
            if (rc != 0) throw new Exception("prepare error " + rc);
            try {
                int colCount = sqlite3_column_count(stmt);
                var colNames = new string[colCount];
                for (int i = 0; i < colCount; i++) {
                    colNames[i] = Marshal.PtrToStringUni(sqlite3_column_name16(stmt, i));
                }
                while (sqlite3_step(stmt) == 100) {
                    var row = new Dictionary<string, string>();
                    for (int i = 0; i < colCount; i++) {
                        IntPtr textPtr = sqlite3_column_text16(stmt, i);
                        row[colNames[i]] = textPtr != IntPtr.Zero ? Marshal.PtrToStringUni(textPtr) : null;
                    }
                    results.Add(row);
                }
            } finally {
                sqlite3_finalize(stmt);
            }
        } finally {
            sqlite3_close(db);
        }
        return results;
    }
}
"@

Add-Type -TypeDefinition $csharp

$dbFile = Join-Path $tempDir "meta.db"
$rows = [WinSqliteSync]::Query($dbFile, "SELECT id, local_title FROM items WHERE local_title LIKE 'SET %.mp3' AND trashed = 0")
Write-Host "Encontrados $($rows.Count) arquivos no Google Drive."

$map = @{}
foreach ($r in $rows) {
  $map[$r.local_title.Trim()] = $r.id.Trim()
}

$projectDir = (Split-Path -Parent $PSScriptRoot)
$jsonPath = Join-Path $projectDir "data\sets-data.json"
$sets = Get-Content -Raw -Encoding UTF8 $jsonPath | ConvertFrom-Json

$updated = 0
foreach ($s in $sets) {
  if ($map.ContainsKey($s.fileName)) {
    $s.fileId = $map[$s.fileName]
    $updated++
  }
}

$newJson = ConvertTo-Json -InputObject @($sets) -Depth 6
[System.IO.File]::WriteAllText($jsonPath, $newJson, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "Atualizados com sucesso $updated de $($sets.Count) SETs em $jsonPath!"
