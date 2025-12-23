import React from 'react';
import {
  Trash2,
  Lock,
  Pencil,
  Check,
  X,
  Coins,
  LayoutGrid,
  BarChart3,
  Plus,
  Download,
  Home,
} from 'lucide-react';

export const TrashIcon = Trash2;
export const LockIcon = Lock;
export const EditIcon = Pencil;
export const CheckIcon = Check;
export const XIcon = X;
export const MoneyIcon = Coins;
export const CategoryIcon = LayoutGrid;
export const ChartIcon = BarChart3;
export const AddIcon = Plus;
export const ExportIcon = Download;

// Emoji Components for Visual Enhancement
export const MoneyEmoji: React.FC<{ className?: string }> = ({
  className = 'w-5 h-5',
}) => <Coins className={className} />;

export const CategoryEmoji: React.FC<{ className?: string }> = ({
  className = 'w-5 h-5',
}) => <LayoutGrid className={className} />;

export const ChartEmoji: React.FC<{ className?: string }> = ({
  className = 'w-5 h-5',
}) => <BarChart3 className={className} />;

export const CheckEmoji: React.FC<{ className?: string }> = ({
  className = 'w-5 h-5',
}) => <Check className={className} />;

export const HouseEmoji: React.FC<{ className?: string }> = ({
  className = 'w-5 h-5',
}) => <Home className={className} />;

export const PlusEmoji: React.FC<{ className?: string }> = ({
  className = 'w-5 h-5',
}) => <Plus className={className} />;
