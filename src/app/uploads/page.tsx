"use client"

// pages/upload.tsx
import { useState } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export default function UploadPage() {
  const [fileOne, setFileOne] = useState<File | null>(null);
  const [fileTwo, setFileTwo] = useState<File | null>(null);
  const [dataFileOne, setDataFileOne] = useState<any[]>([]); // Data from file one
  const [dataFileTwo, setDataFileTwo] = useState<any[]>([]); // Data from file two
  const [columns, setColumns] = useState<string[]>([]); // Columns from file one
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]); // User's choice
  const [combinedData, setCombinedData] = useState<any[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, fileSetter: (file: File | null) => void) => {
    const file = event.target.files?.[0] || null;
    fileSetter(file);
  };

  const parseExcel = (file: File): Promise<any[]> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        resolve(worksheet);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const parseCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve) => {
      Papa.parse(file, {
        header: true,
        complete: (results) => resolve(results.data),
      });
    });
  };

  const handleProcessFiles = async () => {
    if (!fileOne || !fileTwo) return alert('Please upload both files.');

    // Parse both files
    const dataFileOne = fileOne.name.endsWith('.csv') ? await parseCSV(fileOne) : await parseExcel(fileOne);
    const dataFileTwo = fileTwo.name.endsWith('.csv') ? await parseCSV(fileTwo) : await parseExcel(fileTwo);

    // Set data for preview
    setDataFileOne(dataFileOne);
    setDataFileTwo(dataFileTwo);

    // Get unique columns from file one for user to select
    setColumns(Object.keys(dataFileOne[0]));
  };

  // Combine data
  const handleCombineData = () => {
    const mergedData = dataFileTwo.map((rowTwo) => {
      const matchingRowOne = dataFileOne.find((rowOne) => rowOne['chassin'] === rowTwo['chassin']);
      if (matchingRowOne) {
        // Add all selected columns from file one to file two
        selectedColumns.forEach((col) => {
          rowTwo[col] = matchingRowOne[col];
        });
      }
      return rowTwo;
    });

    setCombinedData(mergedData);
  };

  // Export as Excel (.xlsx)
  const exportAsExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(combinedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Combined Data');
    XLSX.writeFile(workbook, 'combined_data.xlsx');
  };

  // Export as CSV
  const exportAsCSV = () => {
    const csv = Papa.unparse(combinedData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'combined_data.csv');
    link.click();
  };

  // Preview data in table format
  const renderTable = (data: any[]) => (
    <table className="table-auto w-full border-collapse border border-gray-300">
      <thead>
        <tr>
          {Object.keys(data[0] || {}).map((key) => (
            <th key={key} className="border border-gray-300 px-4 py-2">{key}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => (
          <tr key={index}>
            {Object.values(row).map((value, i) => (
              <td key={i} className="border border-gray-300 px-4 py-2">{value}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Upload and Combine Excel/CSV Files</h1>
      
      <div className="mb-4">
        <label className="block mb-2 font-semibold">Upload File One</label>
        <input type="file" accept=".xlsx,.csv" onChange={(e) => handleFileUpload(e, setFileOne)} />
      </div>

      <div className="mb-4">
        <label className="block mb-2 font-semibold">Upload File Two</label>
        <input type="file" accept=".xlsx,.csv" onChange={(e) => handleFileUpload(e, setFileTwo)} />
      </div>

      <button
        onClick={handleProcessFiles}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-4"
      >
        Preview Files
      </button>

      {/* Inline preview of both files */}
      <div className="flex space-x-4 mt-8">
        {dataFileOne.length > 0 && (
          <div className="w-1/2">
            <h2 className="text-xl font-semibold mb-2">File One Data:</h2>
            {renderTable(dataFileOne)}
          </div>
        )}

        {dataFileTwo.length > 0 && (
          <div className="w-1/2">
            <h2 className="text-xl font-semibold mb-2">File Two Data:</h2>
            {renderTable(dataFileTwo)}
          </div>
        )}
      </div>

      {columns.length > 0 && (
        <div className="mb-4 mt-4">
          <label className="block mb-2 font-semibold">Choose columns from File One to add to File Two</label>
          <div className="space-y-2">
            {columns.map((col) => (
              <div key={col} className="flex items-center">
                <input
                  type="checkbox"
                  value={col}
                  checked={selectedColumns.includes(col)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedColumns([...selectedColumns, col]);
                    } else {
                      setSelectedColumns(selectedColumns.filter(c => c !== col));
                    }
                  }}
                  className="mr-2"
                />
                <label className="text-gray-700">{col}</label>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleCombineData}
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-4"
      >
        Combine Files
      </button>

      {combinedData.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Combined Data:</h2>
          {renderTable(combinedData)}

          <div className="mt-4">
            <button
              onClick={exportAsExcel}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-4"
            >
              Export as Excel
            </button>
            <button
              onClick={exportAsCSV}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
            >
              Export as CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
