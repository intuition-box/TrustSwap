import * as React from "react";

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...props }) => (
  <button className="px-4 py-2 rounded-xl shadow font-medium" {...props}>
    {children}
  </button>
);
