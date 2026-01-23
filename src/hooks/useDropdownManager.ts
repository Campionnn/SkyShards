import { useState, useRef, useEffect } from "react";

export const useDropdownManager = () => {
  const [dropdownOpen, setDropdownOpen] = useState<{ [key: string]: boolean }>({});
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      let shouldClose = false;

      Object.entries(dropdownOpen).forEach(([key, isOpen]) => {
        if (isOpen && dropdownRefs.current[key] && !dropdownRefs.current[key]?.contains(target)) {
          shouldClose = true;
        }
      });

      if (shouldClose) {
        setDropdownOpen({});
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const toggleDropdown = (key: string) => {
    setDropdownOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const closeDropdown = (key: string) => {
    setDropdownOpen((prev) => ({ ...prev, [key]: false }));
  };

  const setRef = (key: string, ref: HTMLDivElement | null) => {
    dropdownRefs.current[key] = ref;
  };

  return {
    dropdownOpen,
    toggleDropdown,
    closeDropdown,
    setRef,
  };
};
