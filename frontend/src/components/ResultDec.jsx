import React, { useState, useEffect } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Returns the current academic year in the format "YYYY-YY" (e.g. "2026-27").
 * Academic year starts in July (month >= 6 in 0-index = July).
 */
const getCurrentAcademicYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  // If month is July (6) or later, the academic year is year → (year+1)
  // Otherwise it is (year-1) → year
  if (month >= 6) {
    return `${year}-${String(year + 1).slice(-2)}`;
  }
  return `${year - 1}-${String(year).slice(-2)}`;
};

// Generate all academic year options from 2021-22 up to 5 years in the future
const generateYearOptions = () => {
  const options = [];
  const endYear = new Date().getFullYear() + 5;
  for (let y = 2021; y <= endYear; y++) {
    const label = `${y} - ${y + 1}`;
    const value = `${y}-${String(y + 1).slice(-2)}`;
    options.push({ value, label });
  }
  return options;
};

const YEAR_OPTIONS = generateYearOptions();

const ResultSearch = () => {
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear());
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();

    if (!academicYear) {
      setError("Academic Year is required");
      return;
    }

    setError("");
    setResults([]);
    setLoading(true);

    try {
      const response = await axios({
        method: "post",
        url: `${API_URL}/api/search/result/search`,
        data: {
          academicYear: academicYear.replace(/-/g, " - "), // Format: "2026 - 27"
        },
        headers: { "Content-Type": "application/json" },
      });

      if (response.data && Array.isArray(response.data)) {
        setResults(response.data);
        if (response.data.length === 0) {
          setError("No results found for the selected academic year");
        }
      } else {
        setError("Invalid response format from server");
      }
    } catch (err) {
      if (err.code === "ERR_NETWORK") {
        setError("Unable to connect to server. Please check if the server is running.");
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Failed to fetch results. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="flex flex-col">
      <h2 className="text-2xl font-bold mb-4">Search Results by Academic Year</h2>

      <form
        onSubmit={handleSearch}
        className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full max-w-lg mb-6"
      >
        <select
          value={academicYear}
          onChange={(e) => setAcademicYear(e.target.value)}
          className="border border-gray-300 rounded-lg p-2 w-full sm:w-auto focus:outline-none focus:ring focus:ring-blue-300"
          disabled={loading}
        >
          {YEAR_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className={`bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-300 ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && (
        <div className="text-red-500 mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table-auto border-collapse border border-gray-300 w-full max-w-5xl text-center text-sm">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 px-4 py-2">#</th>
                <th className="border border-gray-300 px-4 py-2">Exam Flag</th>
                <th className="border border-gray-300 px-4 py-2">Subject Code</th>
                <th className="border border-gray-300 px-4 py-2">Academic Year</th>
                <th className="border border-gray-300 px-4 py-2">Course Name</th>
                <th className="border border-gray-300 px-4 py-2">Part</th>
                <th className="border border-gray-300 px-4 py-2">Semester</th>
                <th className="border border-gray-300 px-4 py-2">Declared On</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr
                  key={index}
                  className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors`}
                >
                  <td className="border border-gray-300 px-4 py-2 text-gray-500">{index + 1}</td>
                  <td className="border border-gray-300 px-4 py-2">{result.examFlag}</td>
                  <td className="border border-gray-300 px-4 py-2 font-mono">{result.subjectCode}</td>
                  <td className="border border-gray-300 px-4 py-2">{result.academicYear}</td>
                  <td className="border border-gray-300 px-4 py-2 text-left">{result.courseName}</td>
                  <td className="border border-gray-300 px-4 py-2">{result.part}</td>
                  <td className="border border-gray-300 px-4 py-2">{result.semester}</td>
                  <td className="border border-gray-300 px-4 py-2 text-gray-600 whitespace-nowrap">
                    {formatDate(result.declaredOn)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!error && results.length === 0 && !loading && (
        <div className="text-gray-500 mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
          No results found for the selected academic year
        </div>
      )}
    </div>
  );
};

export default ResultSearch;
