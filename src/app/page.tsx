"use client"

// pages/upload.tsx
import { useState } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface DataRow {
  [key: string]: any;
}

export default function UploadPage() {
  const [fileOne, setFileOne] = useState<File | null>(null);
  const [fileTwo, setFileTwo] = useState<File | null>(null);
  const [dataFileOne, setDataFileOne] = useState<DataRow[]>([]);
  const [dataFileTwo, setDataFileTwo] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [combinedData, setCombinedData] = useState<DataRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, fileSetter: (file: File | null) => void) => {
    const file = event.target.files?.[0] || null;
    fileSetter(file);
  };

  const parseExcel = (file: File): Promise<DataRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        resolve(worksheet as DataRow[]);
      };
      reader.onerror = () => reject(new Error('Error reading Excel file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const parseCSV = (file: File): Promise<DataRow[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        complete: (results) => resolve(results.data as DataRow[]),
        error: () => reject(new Error('Error reading CSV file')),
      });
    });
  };

  const handleProcessFiles = async () => {
    if (!fileOne || !fileTwo) return alert('Please upload both files.');

    setIsLoading(true);
    try {
      const dataFileOne = fileOne.name.endsWith('.csv') ? await parseCSV(fileOne) : await parseExcel(fileOne);
      const dataFileTwo = fileTwo.name.endsWith('.csv') ? await parseCSV(fileTwo) : await parseExcel(fileTwo);

      setDataFileOne(dataFileOne);
      setDataFileTwo(dataFileTwo);
      setColumns(Object.keys(dataFileOne[0]));
    } catch (error) {
      alert('An error occurred while processing the files. Please check the file format.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCombineData = () => {
    const mergedData = dataFileTwo.map((rowTwo) => {
      const matchingRowOne = dataFileOne.find((rowOne) => rowOne['chassin'] === rowTwo['chassin']);
      if (matchingRowOne) {
        selectedColumns.forEach((col) => {
          rowTwo[col] = matchingRowOne[col];
        });
      }
      return rowTwo;
    });

    setCombinedData(mergedData);
  };

  const exportAsExcel = () => {
    const filteredData = combinedData.map(row => {
      const newRow: DataRow = {};
      Object.keys(row).forEach(col => {
        if (!hiddenColumns.includes(col)) {
          newRow[col] = row[col];
        }
      });
      return newRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered Data');
    XLSX.writeFile(workbook, 'combined_data.xlsx');
  };

  const exportAsCSV = () => {
    const filteredData = combinedData.map(row => {
      const newRow: DataRow = {};
      Object.keys(row).forEach(col => {
        if (!hiddenColumns.includes(col)) {
          newRow[col] = row[col];
        }
      });
      return newRow;
    });

    const csv = Papa.unparse(filteredData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'combined_data.csv');
    link.click();
  };

  const renderTable = (data: DataRow[], hideColumns: string[]) => (
    <table className="table-auto w-full border-collapse border border-gray-300">
      <thead>
        <tr>
          {Object.keys(data[0] || {}).map((key) => (
            !hideColumns.includes(key) && (
              <th key={key} className="border border-gray-300 px-4 py-2">{key}</th>
            )
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => (
          <tr key={index}>
            {Object.values(row).map((value, i) => (
              !hideColumns.includes(Object.keys(row)[i]) && (
                <td key={i} className="border border-gray-300 px-4 py-2">{value}</td>
              )
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Upload and Combine Excel/CSV Files</h1>
      
      {isLoading && <p>Loading...</p>}

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

      <div className="flex space-x-4 mt-8">
        {dataFileOne.length > 0 && (
          <div className="w-1/2">
            <h2 className="text-xl font-semibold mb-2">File One Data:</h2>
            {renderTable(dataFileOne, [])} {/* Do not hide any columns */}
          </div>
        )}

        {dataFileTwo.length > 0 && (
          <div className="w-1/2">
            <h2 className="text-xl font-semibold mb-2">File Two Data:</h2>
            {renderTable(dataFileTwo, [])} {/* Do not hide any columns */}
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

      {combinedData.length > 0 && (
        <div className="mb-4 mt-4">
          <label className="block mb-2 font-semibold">Choose a column to hide in Combined Data</label>
          <div className="space-y-2">
            {Object.keys(combinedData[0] || {}).map((col) => (
              <div key={col} className="flex items-center">
                <input
                  type="checkbox"
                  value={col}
                  checked={hiddenColumns.includes(col)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setHiddenColumns([...hiddenColumns, col]);
                    } else {
                      setHiddenColumns(hiddenColumns.filter(c => c !== col));
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
          {renderTable(combinedData, hiddenColumns)} {/* Pass hiddenColumns only for Combined Data */}

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
