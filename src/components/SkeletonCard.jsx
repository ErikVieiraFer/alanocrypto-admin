const SkeletonCard = () => {
  return (
    <div className="bg-card rounded-lg p-6 border border-gray-700 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-10 w-10 bg-gray-700 rounded-lg"></div>
      </div>
      <div className="h-4 bg-gray-700 rounded w-2/3 mb-2"></div>
      <div className="h-8 bg-gray-700 rounded w-1/2"></div>
    </div>
  );
};

export default SkeletonCard;
