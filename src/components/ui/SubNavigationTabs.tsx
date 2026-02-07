import React from 'react';

export interface SubNavigationTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SubNavigationTabsProps {
  tabs: SubNavigationTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function SubNavigationTabs({
  tabs,
  activeTab,
  onTabChange,
  className = ''
}: SubNavigationTabsProps) {
  return (
    <div className={`border-b border-gray-200 ${className}`}>
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
