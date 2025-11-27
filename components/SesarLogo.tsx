import React from 'react';

// Raw SVG string for usage in non-React contexts (Canvas/Image generation)
// Note: Attributes are kebab-case for standard SVG compatibility
export const SESAR_LOGO_STRING = `
<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" fill="none">
    <path d="M260 10 L275 40 L300 45 L280 65 L285 90 L260 75 L235 90 L240 65 L220 45 L245 40 Z" fill="#78be20" stroke="#005da9" stroke-width="2"/>
    <path d="M260 75 L260 10 L245 40 L220 45 L240 65 L235 90 Z" fill="#005da9"/>
    <text x="10" y="70" font-family="sans-serif" font-weight="bold" font-size="60" fill="#0099d8">sesar</text>
    <text x="10" y="95" font-family="sans-serif" font-weight="bold" font-size="14" fill="#78be20" letter-spacing="1">DEPLOYMENT MANAGER</text>
</svg>
`;

export const SesarLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 300 100" className={className} xmlns="http://www.w3.org/2000/svg" fill="none">
    {/* Stylized Star */}
    <path d="M260 10 L275 40 L300 45 L280 65 L285 90 L260 75 L235 90 L240 65 L220 45 L245 40 Z" fill="#78be20" stroke="#005da9" strokeWidth="2"/>
    <path d="M260 75 L260 10 L245 40 L220 45 L240 65 L235 90 Z" fill="#005da9"/>
    
    {/* Text "sesar" */}
    <text x="10" y="70" fontFamily="sans-serif" fontWeight="bold" fontSize="60" fill="#0099d8">sesar</text>
    
    {/* Subtext */}
    <text x="10" y="95" fontFamily="sans-serif" fontWeight="bold" fontSize="14" fill="#78be20" letterSpacing="1">DEPLOYMENT MANAGER</text>
  </svg>
);