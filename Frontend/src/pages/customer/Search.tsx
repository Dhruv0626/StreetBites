import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, ArrowLeft, Star, Store, UtensilsCrossed } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { type Stall, type Dish } from '../../data/mockData';
import { clusterService } from '../../services/clusterService';

export const Search: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [allStalls, setAllStalls] = useState<Stall[]>([]);
  const [matchingStalls, setMatchingStalls] = useState<Stall[]>([]);
  const [matchingDishes, setMatchingDishes] = useState<{ stall: Stall, dish: Dish }[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await clusterService.getClusters();
        if (res.success && res.data) {
          const mapped: Stall[] = res.data.flatMap((c: any) =>
            (c.stalls || []).map((s: any, idx: number) => {
              const mappedDishes: Dish[] = (s.menu_items || []).map((m: any, mIdx: number) => ({
                id: m._id || `dish_${mIdx}`,
                name: m.name,
                price: m.price || m.base_price || 0,
                description: m.description || '',
                image_url: m.image_url || '',
                category: m.category || (m.food_item_id && typeof m.food_item_id === 'object' ? m.food_item_id.name : '') || '',
                is_available: m.is_available !== false,
                status: m.status || 'Approved',
              }));

              const categories = Array.from(new Set(mappedDishes.map(d => d.category).filter(Boolean)));
              if (categories.length === 0) categories.push('All Items');

              return {
                id: s.id,
                name: s.name,
                stall_category: s.stall_category || 'Street Food',
                cluster: c.name,
                rating: s.rating || 0.0,
                open_till: s.open_till || '',
                since: s.since || '1998',
                description: s.description || '',
                image_url: s.image_url || '',
                is_accepting_orders: s.status !== 'CLOSED' && Boolean(s.is_accepting_orders),
                status: s.status || 'ACTIVE',
                categories,
                dishes: mappedDishes,
              };
            })
          );
          setAllStalls(mapped);
        }
      } catch (err) {
        console.error('Failed to load stalls for search:', err);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim().toLowerCase();
    if (trimmedQuery === '') {
      setMatchingStalls([]);
      setMatchingDishes([]);
      return;
    }

    // Find specific dishes that match by dish name or specific dish category
    const dishes: { stall: Stall, dish: Dish }[] = [];
    allStalls.forEach(stall => {
      stall.dishes.forEach(dish => {
        const dishName = (dish.name || '').toLowerCase();
        const dishCat = (dish.category || '').toLowerCase();
        const stallCat = (stall.stall_category || '').toLowerCase();

        // Match if dish name contains the search term, or dish's own category matches (avoiding stall category leakage)
        const matchesName = dishName.includes(trimmedQuery);
        const matchesOwnCategory = dishCat && dishCat !== stallCat && (dishCat === trimmedQuery || dishCat.includes(trimmedQuery));

        if (matchesName || matchesOwnCategory) {
          dishes.push({ stall, dish });
        }
      });
    });

    // Find stalls that match by stall name, stall category, or that contain a matching dish
    const stalls = allStalls.filter(stall => {
      const stallNameMatches = stall.name.toLowerCase().includes(trimmedQuery);
      const stallCatMatches = stall.stall_category && stall.stall_category.toLowerCase().includes(trimmedQuery);
      const hasMatchingDish = stall.dishes.some(dish => {
        const dishName = (dish.name || '').toLowerCase();
        const dishCat = (dish.category || '').toLowerCase();
        const stallCat = (stall.stall_category || '').toLowerCase();
        return dishName.includes(trimmedQuery) || (dishCat && dishCat !== stallCat && (dishCat === trimmedQuery || dishCat.includes(trimmedQuery)));
      });

      return stallNameMatches || stallCatMatches || hasMatchingDish;
    });

    setMatchingStalls(stalls);
    setMatchingDishes(dishes);
  }, [query, allStalls]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSearchParams(val ? { q: val } : {});
  };

  const handleTagClick = (tag: string) => {
    setQuery(tag);
    setSearchParams({ q: tag });
  };

  return (
    <div className="bg-[#FAF7F2] min-h-screen pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-3 sticky top-0 z-30 shadow-sm flex gap-3 items-center">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-stone-100">
          <ArrowLeft className="w-5 h-5 text-stone-800" />
        </button>
        <div className="relative flex-1 flex items-center bg-[#F0ECE4] rounded-full px-4 py-2 border border-transparent focus-within:border-[#DCD6CC] focus-within:bg-white focus-within:shadow-sm transition-all group">
          <SearchIcon className="w-4 h-4 mr-3 text-[#9CA3AF] group-focus-within:text-[#D94A38] transition-colors" />
          <input
            type="text"
            placeholder="Search for stalls, dishes, categories..."
            className="bg-transparent outline-none w-full text-sm text-[#1C1917] placeholder-[#9CA3AF]"
            value={query}
            onChange={handleSearch}
            autoFocus
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {query.trim() === '' ? (
          <>
            {Array.from(new Set(allStalls.flatMap(s => s.categories).filter(c => c && c.toLowerCase() !== 'street food'))).length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-bold text-[#1C1917] mb-3">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(allStalls.flatMap(s => s.categories).filter(c => c && c.toLowerCase() !== 'street food'))).map((catName, idx) => (
                    <span
                      key={idx}
                      onClick={() => handleTagClick(catName)}
                      className="px-3 py-1.5 bg-white border border-[#EAE4DA] text-[#1C1917] text-xs font-bold rounded-full cursor-pointer hover:border-[#D94A38] hover:text-[#D94A38] transition-colors flex items-center gap-1.5 shadow-3xs"
                    >
                      <span>🍽️</span>
                      {catName}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-[#1C1917] mb-3">Popular Searches</h3>
              <div className="flex flex-wrap gap-2">
                {['Manek Chowk', 'Pav Bhaji', 'Kulfi', 'Dabeli', 'Sandwich'].map((tag) => (
                  <span
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className="px-3 py-1.5 bg-white border border-[#EAE4DA] text-[#1C1917] text-xs font-medium rounded-full cursor-pointer hover:bg-[#FCE8E6] transition-colors shadow-3xs"
                  >
                    <SearchIcon className="w-3 h-3 inline-block mr-1 text-stone-400" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-8 animate-fadeIn">
            {matchingStalls.length === 0 && matchingDishes.length === 0 && (
              <div className="text-center py-12 text-stone-500">
                <p className="font-bold text-lg text-stone-700">No matches found</p>
                <p className="text-sm mt-1">Try searching for something else like "Pav Bhaji" or "Kulfi"</p>
              </div>
            )}

            {matchingStalls.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-[#1C1917] mb-4">Stalls ({matchingStalls.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {matchingStalls.map(stall => (
                    <div
                      key={stall.id}
                      className="bg-white rounded-2xl p-4 shadow-3xs border border-[#EAE4DA] cursor-pointer hover:shadow-md transition-shadow flex items-start gap-3"
                      onClick={() => navigate(`/stall/${stall.id}`)}
                    >
                      <div className="w-16 h-16 rounded-xl bg-stone-100 border border-stone-100 flex items-center justify-center overflow-hidden shrink-0">
                        {stall.image_url ? (
                          <img src={stall.image_url} alt={stall.name} className="w-full h-full object-cover" />
                        ) : (
                          <Store className="w-6 h-6 text-stone-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-[#1C1917]">{stall.name}</h4>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 w-fit px-1.5 py-0.5 rounded mt-1">
                          {stall.rating} <Star className="w-3 h-3 fill-current" />
                        </div>
                        <p className="text-xs text-stone-500 mt-1">{stall.stall_category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {matchingDishes.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-[#1C1917] mb-4">Dishes ({matchingDishes.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matchingDishes.map(({ stall, dish }) => (
                    <div
                      key={`${stall.id}-${dish.id}`}
                      className="bg-white rounded-2xl p-4 shadow-3xs border border-[#EAE4DA] cursor-pointer hover:shadow-md transition-shadow flex gap-4 items-center"
                      onClick={() => navigate(`/stall/${stall.id}`)}
                    >
                      <div className="w-16 h-16 rounded-xl overflow-hidden shadow-xs relative flex items-center justify-center bg-stone-100 shrink-0">
                        {dish.image_url ? (
                          <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover" />
                        ) : (
                          <UtensilsCrossed className="w-6 h-6 text-stone-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-[#1C1917]">{dish.name}</h4>
                        <p className="text-xs text-stone-500 mt-0.5">{dish.description}</p>
                        <p className="text-sm font-extrabold text-[#1C1917] mt-1">₹{dish.price}</p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">From</span>
                        <div className="text-xs font-bold text-[#D94A38] bg-[#FCE8E6] px-2 py-1 rounded-md">{stall.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
