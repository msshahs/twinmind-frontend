import { createContext, useContext, useState } from "react";

const LoaderContext = createContext();

export const useLoader = () => useContext(LoaderContext);

export const LoaderProvider = ({ children }) => {
    const [loading, setLoading] = useState(false);

    return (
        <LoaderContext.Provider value={{ loading, setLoading }}>
            {loading && (
                <div className="fixed inset-0 bg-white bg-opacity-80 z-[9999] flex items-center justify-center">
                    <svg
                        className="animate-spin h-12 w-12 text-orange-600"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                    </svg>
                </div>
            )}
            {children}
        </LoaderContext.Provider>
    );
};
