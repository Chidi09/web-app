// web-app/src/CreateAssignmentForm.tsx

import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import axios from 'axios';

// IMPORTANT: Ensure this matches your backend URL from App.tsx
const BACKEND_URL = 'http://localhost:3000';

// Define the interface for the category data structure, including handlerType
interface CategoryData {
  name: string;
  description: string;
  handlerType: 'comp_sci_helpers' | 'external_stem_team' | 'ai_misc';
}

// Define the interface for the created assignment data structure
// This should match the structure returned by your backend's POST /assignments endpoint
// NOTE: ownerId is a string here, as it's the ID sent to the backend before population.
interface CreatedAssignmentData {
  _id: string; // MongoDB ID
  ownerId: string; // This is the ID of the owner, as sent by the form
  helperId: string | null;
  title: string;
  description: string;
  complexity: 'low' | 'medium' | 'high';
  category: string;
  deadline: string; // ISO string
  paymentAmount: number;
  attachments: { url: string; filename: string }[];
  status: 'pending' | 'accepted' | 'due' | 'completed' | 'pending_client_review' | 'ready_for_payout' | 'paid' | 'cancelled'; // Removed 'pending_external_assignment' to match backend
  commissionRates: { app: number; lead: number; helper: number };
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  completedAt: string | null;
  paidAt: string | null;
}

// Define the interface for the successful response from POST /assignments
interface CreateAssignmentResponse {
  message: string;
  assignment: CreatedAssignmentData;
}

// Define the interface for the props of CreateAssignmentForm
interface CreateAssignmentFormProps {
  userId: string; // userId is a string (MongoDB ObjectId)
  // onAssignmentCreated is an optional function that receives an UnpopulatedAssignmentData object
  onAssignmentCreated?: (assignment: CreatedAssignmentData) => void; // This should be CreatedAssignmentData as returned by backend
}

// Helper function for keyword-based category suggestion
const suggestCategory = (description: string, allCategories: CategoryData[]): string | null => {
  const lowerDescription = description.toLowerCase();
  let bestMatch: string | null = null;
  let highestScore = 0;

  const keywords: { [key: string]: string[] } = {
    // Comp Sci
    'java': ['programming - java', 'programming'],
    'python': ['programming - python', 'programming'],
    'javascript': ['web development', 'programming'],
    'react': ['web development'],
    'node.js': ['web development'],
    'html': ['web development'],
    'css': ['web development'],
    'algorithm': ['algorithms & data structures', 'computer science'],
    'data structure': ['algorithms & data structures', 'computer science'],
    'database': ['database management'],
    'sql': ['database management'],
    'nosql': ['database management'],
    'network': ['networking'],
    'operating system': ['operating systems'],
    'machine learning': ['machine learning'],
    'ai': ['machine learning'],
    'web project': ['web development'],
    'software engineering': ['computer science'],
    'coding': ['programming - java', 'programming - python', 'computer science'],

    // STEM (External)
    'algebra': ['math - algebra'],
    'calculus': ['math - calculus'],
    'statistics': ['math - statistics'],
    'probability': ['math - statistics'],
    'physics': ['physics - mechanics', 'physics - electromagnetism'],
    'mechanics': ['physics - mechanics'],
    'circuits': ['engineering - electrical', 'physics - electromagnetism'],
    'electrical': ['engineering - electrical'],
    'mechanical': ['engineering - mechanical'],
    'thermodynamics': ['engineering - mechanical'],
    'fluid dynamics': ['engineering - mechanical'],

    // AI/Misc
    'script': ['script writing'],
    'screenplay': ['script writing'],
    'essay': ['essay writing'],
    'research paper': ['essay writing'],
    'report': ['report writing'],
    'design': ['graphic design'],
    'logo': ['graphic design'],
    'ui/ux': ['graphic design'],
    'presentation': ['graphic design', 'script writing'],
  };

  for (const keyword in keywords) {
    if (lowerDescription.includes(keyword)) {
      for (const suggestedCategoryName of keywords[keyword]) {
        const matchingCategory = allCategories.find(cat => cat.name.toLowerCase() === suggestedCategoryName.toLowerCase());
        if (matchingCategory) {
          // Simple scoring: prioritize more specific matches or direct hits
          const score = keyword.length; // Longer keywords might indicate better match
          if (score > highestScore) {
            highestScore = score;
            bestMatch = matchingCategory.name;
          }
        }
      }
    }
  }
  return bestMatch;
};


function CreateAssignmentForm({ userId, onAssignmentCreated }: CreateAssignmentFormProps) {
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [complexity, setComplexity] = useState<'low' | 'medium' | 'high'>('low');
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>(''); // e.g., "Comp Sci Helpers"
  const [category, setCategory] = useState<string>(''); // Specific sub-category, e.g., "Programming - Java"
  const [deadline, setDeadline] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const [allCategories, setAllCategories] = useState<CategoryData[]>([]);
  const [groupedCategories, setGroupedCategories] = useState<Record<string, CategoryData[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);


  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get<{ categories: CategoryData[] }>(`${BACKEND_URL}/categories`);
        setAllCategories(response.data.categories);

        // Group categories by handlerType
        const grouped: Record<string, CategoryData[]> = response.data.categories.reduce((acc, cat) => {
          if (!acc[cat.handlerType]) {
            acc[cat.handlerType] = [];
          }
          acc[cat.handlerType].push(cat);
          return acc;
        }, {} as Record<string, CategoryData[]>);
        setGroupedCategories(grouped);

        // Set default main category and sub-category
        if (Object.keys(grouped).length > 0) {
          const firstMainCategory = Object.keys(grouped)[0];
          setSelectedMainCategory(firstMainCategory);
          if (grouped[firstMainCategory] && grouped[firstMainCategory].length > 0) {
            setCategory(grouped[firstMainCategory][0].name);
          }
        }
      } catch (err: any) {
        console.error('Error fetching categories:', err.response?.data || err.message);
        setError('Failed to load categories. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Effect to update sub-category when main category changes
  useEffect(() => {
    if (selectedMainCategory && groupedCategories[selectedMainCategory]?.length > 0) {
      setCategory(groupedCategories[selectedMainCategory][0].name);
    } else {
      setCategory(''); // Clear sub-category if no main category or no sub-categories
    }
  }, [selectedMainCategory, groupedCategories]);


  // Handle description change for suggestions
  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newDescription = e.target.value;
    setDescription(newDescription);
    if (newDescription.length > 10) { // Start suggesting after a few characters
      const suggestion = suggestCategory(newDescription, allCategories);
      setSuggestedCategory(suggestion);
    } else {
      setSuggestedCategory(null);
    }
  };

  const handleApplySuggestion = () => {
    if (suggestedCategory) {
      const suggestedCatData = allCategories.find(cat => cat.name === suggestedCategory);
      if (suggestedCatData) {
        setSelectedMainCategory(suggestedCatData.handlerType);
        setCategory(suggestedCatData.name);
        setSuggestedCategory(null); // Clear suggestion after applying
      }
    }
  };


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    // Basic validation
    if (!title || !description || !category || !deadline || paymentAmount <= 0) {
      setError('Please fill in all required fields and ensure payment amount is greater than 0.');
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('complexity', complexity);
    formData.append('category', category); // Send the specific sub-category name
    formData.append('deadline', new Date(deadline).toISOString());
    formData.append('paymentAmount', paymentAmount.toString());
    formData.append('ownerId', userId);

    if (selectedFiles) {
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('attachments', selectedFiles[i]);
      }
    }

    try {
      const response = await axios.post<CreateAssignmentResponse>(`${BACKEND_URL}/assignments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-user-id': userId
        },
      });

      setSuccessMessage('Assignment created successfully!');
      if (onAssignmentCreated) {
        onAssignmentCreated(response.data.assignment);
      }
      // Clear form fields
      setTitle('');
      setDescription('');
      setComplexity('low');
      // Reset category selection to initial defaults based on fetched data
      if (Object.keys(groupedCategories).length > 0) {
        const firstMainCategory = Object.keys(groupedCategories)[0];
        setSelectedMainCategory(firstMainCategory);
        if (groupedCategories[firstMainCategory] && groupedCategories[firstMainCategory].length > 0) {
          setCategory(groupedCategories[firstMainCategory][0].name);
        }
      } else {
        setSelectedMainCategory('');
        setCategory('');
      }
      setDeadline('');
      setPaymentAmount(0);
      setSelectedFiles(null);
      const fileInput = document.getElementById('attachments-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (err: any) {
      console.error('Error creating assignment:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to create assignment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  if (loading) {
    return <p className="text-discord_white text-center py-8">Loading categories...</p>;
  }

  return (
    <div className="bg-gradient-to-br from-discord_darker to-discord_darkest p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md mx-auto mt-8 border border-discord_darker transform transition-all duration-300 hover:scale-[1.01]">
      <h2 className="text-2xl sm:text-3xl font-extrabold text-discord_blurple mb-6 text-center tracking-wide">
        Create New Assignment
      </h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-discord_gray text-sm font-semibold mb-2">
            Title:
          </label>
          <input
            type="text"
            id="title"
            className="shadow-inner appearance-none border border-discord_darker rounded-md w-full py-2 px-3 text-discord_white leading-tight focus:outline-none focus:ring-2 focus:ring-discord_blurple focus:border-transparent bg-discord_darker placeholder-gray-850 transition duration-200 ease-in-out transform focus:scale-[1.01]"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g., Build a React component"
          />
        </div>
        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-discord_gray text-sm font-semibold mb-2">
            Description:
          </label>
          <textarea
            id="description"
            className="shadow-inner appearance-none border border-discord_darker rounded-md w-full py-2 px-3 text-discord_white leading-tight focus:outline-none focus:ring-2 focus:ring-discord_blurple focus:border-transparent bg-discord_darker placeholder-gray-850 h-28 resize-none transition duration-200 ease-in-out transform focus:scale-[1.01]"
            value={description}
            onChange={handleDescriptionChange} // Use the new handler
            required
            placeholder="Provide a detailed description of the task..."
          ></textarea>
          {suggestedCategory && (
            <div className="mt-2 p-2 bg-discord_light_dark rounded-md text-sm text-discord_white flex items-center justify-between">
              <span>Suggested Category: <span className="font-bold text-discord_green">{suggestedCategory}</span></span>
              <button
                type="button"
                onClick={handleApplySuggestion}
                className="ml-4 px-3 py-1 bg-discord_blurple text-discord_white rounded-full text-xs font-semibold hover:bg-opacity-90 transition-colors"
              >
                Apply
              </button>
            </div>
          )}
        </div>
        {/* Complexity */}
        <div>
          <label htmlFor="complexity" className="block text-discord_gray text-sm font-semibold mb-2">
            Complexity:
          </label>
          <div className="relative">
            <select
              id="complexity"
              className="shadow-inner border border-discord_darker rounded-md w-full py-2 px-3 text-discord_white leading-tight focus:outline-none focus:ring-2 focus:ring-discord_blurple focus:border-transparent bg-discord_darker appearance-none pr-8 transition duration-200 ease-in-out transform focus:scale-[1.01]"
              value={complexity}
              onChange={(e) => setComplexity(e.target.value as 'low' | 'medium' | 'high')}
              required
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-discord_gray">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>
        {/* Main Category Group Selection */}
        <div>
          <label htmlFor="mainCategory" className="block text-discord_gray text-sm font-semibold mb-2">
            Assignment Group:
          </label>
          <div className="relative">
            <select
              id="mainCategory"
              className="shadow-inner border border-discord_darker rounded-md w-full py-2 px-3 text-discord_white leading-tight focus:outline-none focus:ring-2 focus:ring-discord_blurple focus:border-transparent bg-discord_darker appearance-none pr-8 transition duration-200 ease-in-out transform focus:scale-[1.01]"
              value={selectedMainCategory}
              onChange={(e) => setSelectedMainCategory(e.target.value)}
              required
            >
              {Object.keys(groupedCategories).map((groupName) => (
                <option key={groupName} value={groupName}>
                  {groupName.replace(/_/g, ' ').toUpperCase()} {/* Format for display */}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-discord_gray">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>
        {/* Specific Category (Sub-category) Selection */}
        {selectedMainCategory && groupedCategories[selectedMainCategory]?.length > 0 && (
          <div>
            <label htmlFor="category" className="block text-discord_gray text-sm font-semibold mb-2">
              Specific Topic:
            </label>
            <div className="relative">
              <select
                id="category"
                className="shadow-inner border border-discord_darker rounded-md w-full py-2 px-3 text-discord_white leading-tight focus:outline-none focus:ring-2 focus:ring-discord_blurple focus:border-transparent bg-discord_darker appearance-none pr-8 transition duration-200 ease-in-out transform focus:scale-[1.01]"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                {groupedCategories[selectedMainCategory].map((cat) => (
                  <option key={cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-discord_gray">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>
        )}
        {/* Deadline */}
        <div>
          <label htmlFor="deadline" className="block text-discord_gray text-sm font-semibold mb-2">
            Deadline:
          </label>
          <input
            type="datetime-local"
            id="deadline"
            className="shadow-inner appearance-none border border-discord_darker rounded-md w-full py-2 px-3 text-discord_white leading-tight focus:outline-none focus:ring-2 focus:ring-discord_blurple focus:border-transparent bg-discord_darker transition duration-200 ease-in-out transform focus:scale-[1.01]"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
          />
        </div>
        {/* Payment Amount */}
        <div>
          <label htmlFor="paymentAmount" className="block text-discord_gray text-sm font-semibold mb-2">
            Payment Amount ($):
          </label>
          <input
            type="number"
            id="paymentAmount"
            className="shadow-inner appearance-none border border-discord_darker rounded-md w-full py-2 px-3 text-discord_white leading-tight focus:outline-none focus:ring-2 focus:ring-discord_blurple focus:border-transparent bg-discord_darker transition duration-200 ease-in-out transform focus:scale-[1.01]"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(parseFloat(e.target.value))}
            required
            min="0"
            step="0.01"
            placeholder="e.g., 50.00"
          />
        </div>
        {/* File Input for Attachments */}
        <div>
          <label htmlFor="attachments-input" className="block text-discord_gray text-sm font-semibold mb-2">
            Attachments (Images, PDFs, Docs):
          </label>
          <input
            type="file"
            id="attachments-input"
            multiple
            className="block w-full text-sm text-discord_white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-discord_blurple file:text-white hover:file:bg-discord_blurple/90 transition-colors duration-200 cursor-pointer"
            onChange={handleFileChange}
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          {selectedFiles && selectedFiles.length > 0 && (
            <div className="mt-2 text-discord_gray text-xs">
              <p className="font-medium mb-1">Selected Files:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {Array.from(selectedFiles).map((file, index) => (
                  <li key={index} className="flex items-center">
                    <svg className="w-3 h-3 mr-1 text-discord_green" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                    {file.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="bg-green-600 bg-opacity-20 border border-green-500 text-green-300 px-4 py-3 rounded-md text-center animate-fade-in-down transition-all duration-300">
            <p className="font-bold">{successMessage}</p>
          </div>
        )}
        {error && (
          <div className="bg-red-600 bg-opacity-20 border border-red-500 text-red-300 px-4 py-3 rounded-md text-center animate-fade-in-down transition-all duration-300">
            <p className="font-bold">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="bg-gradient-to-r from-discord_blurple to-indigo-600 text-discord_white px-6 py-3 rounded-md font-extrabold shadow-lg hover:from-indigo-600 hover:to-discord_blurple transition-all duration-300 w-full text-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-discord_blurple disabled:to-indigo-600"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Create Assignment'}
        </button>
      </form>
    </div>
  );
};

export default CreateAssignmentForm;
