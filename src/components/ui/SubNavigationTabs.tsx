import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface SubNavigationTab {
  id: string;
  name?: string;
  label?: string;
  icon?: LucideIcon | React.ReactNode;
  count?: number;
  color?: 'blue' | 'yellow' | 'green' | 'red' | 'gray';
}

export interface SubNavigationTabsProps {
  tabs: SubNavigationTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

const colorClasses = {
  blue: 'border-blue-500 text-blue-600 bg-blue-50',
  yellow: 'border-yellow-500 text-yellow-600 bg-yellow-50',
  green: 'border-green-500 text-green-600 bg-green-50',
  red: 'border-red-500 text-red-600 bg-red-50',
  gray: 'border-gray-500 text-gray-600 bg-gray-50'
};

export function SubNavigationTabs({
  tabs,
  activeTab,
  onTabChange,
  className = ''
}: SubNavigationTabsProps) {
  return (
    <div className={`border-b border-gray-200 ${className}`}>
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => {
          const Icon = tab.icon as LucideIcon;
          const isActive = activeTab === tab.id;
          const displayName = tab.name || tab.label || tab.id;
          const activeColorClass = tab.color ? colorClasses[tab.color] : 'border-blue-500 text-blue-600';

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center space-x-2 py-4 px-4 border-b-2 font-medium text-sm rounded-t-lg transition-all
                ${
                  isActive
                    ? activeColorClass
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {Icon && typeof Icon === 'function' && <Icon className="w-4 h-4" />}
              {Icon && typeof Icon !== 'function' && <span>{Icon}</span>}
              <span>{displayName}</span>
              {typeof tab.count !== 'undefined' && (
                <span className={`
                  ml-2 px-2 py-0.5 rounded-full text-xs font-semibold
                  ${isActive ? 'bg-white' : 'bg-gray-100 text-gray-600'}
                `}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// Add default export for compatibility
export default SubNavigationTabs;
