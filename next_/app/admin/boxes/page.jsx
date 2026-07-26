'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FaEdit, FaTrash, FaPlus, FaCheck, FaTimes, FaImage } from 'react-icons/fa';
import MediaPickerModal from '@/components/admin/MediaPickerModal';
import { getFileUrl } from '@/lib/utils';

const getApiUrl = () => {
  let urlStr = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  if (typeof window !== 'undefined') {
    try {
      const url = new URL(urlStr);
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        url.hostname = window.location.hostname;
        urlStr = url.toString().replace(/\/$/, '');
      }
    } catch (e) {}
  }
  return urlStr;
};

export default function BoxesPage() {
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBox, setEditingBox] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    isActive: true,
    imageId: null,
    imageObj: null
  });
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  const fetchBoxes = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${getApiUrl()}/boxes`);
      if (Array.isArray(data)) {
        setBoxes(data);
      } else if (data && Array.isArray(data.data)) {
        setBoxes(data.data);
      } else {
        console.warn('API returned non-array data:', data);
        setBoxes([]);
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to fetch boxes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoxes();
  }, []);

  const openModal = (box = null) => {
    if (box) {
      setEditingBox(box);
      setFormData({
        name: box.name,
        isActive: box.isActive,
        imageId: box.imageId || null,
        imageObj: box.image || null
      });
    } else {
      setEditingBox(null);
      setFormData({
        name: '',
        isActive: true,
        imageId: null,
        imageObj: null
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBox(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBox) {
        await axios.put(`${getApiUrl()}/boxes/${editingBox.id}`, formData);
        Swal.fire('Success', 'Box updated successfully', 'success');
      } else {
        await axios.post(`${getApiUrl()}/boxes`, formData);
        Swal.fire('Success', 'Box created successfully', 'success');
      }
      closeModal();
      fetchBoxes();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to save box', 'error');
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`${getApiUrl()}/boxes/${id}`);
        Swal.fire('Deleted!', 'Box has been deleted.', 'success');
        fetchBoxes();
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Failed to delete box', 'error');
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Boxes Management</h1>
        <button 
          onClick={() => openModal()} 
          className="bg-black text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <FaPlus /> Add Box
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading boxes...</div>
      ) : (
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-4">Name</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {boxes.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-4 text-center text-gray-500">No boxes found</td>
                </tr>
              ) : (
                boxes.map(box => (
                  <tr key={box.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 flex items-center gap-3">
                      {box.image ? (
                        <img src={getFileUrl(box.image.url || box.image.filePath || box.image.path || box.image.fileName || (typeof box.image === 'string' ? box.image : null))} alt={box.name} className="w-10 h-10 object-cover rounded shadow-sm border border-gray-200" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400 border border-gray-200"><FaImage /></div>
                      )}
                      <span>{box.name}</span>
                    </td>
                    <td className="p-4">
                      {box.isActive ? (
                        <span className="text-green-500 flex items-center gap-1"><FaCheck /> Active</span>
                      ) : (
                        <span className="text-red-500 flex items-center gap-1"><FaTimes /> Inactive</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => openModal(box)} 
                        className="text-blue-500 hover:text-blue-700 mr-4"
                        title="Edit"
                      >
                        <FaEdit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(box.id)} 
                        className="text-red-500 hover:text-red-700"
                        title="Delete"
                      >
                        <FaTrash size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md" style={{ padding: '24px' }}>
            <h2 className="text-xl font-bold mb-4">{editingBox ? 'Edit Box' : 'Add Box'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Box Name *</label>
                <input 
                  type="text" 
                  className="w-full border rounded p-2 focus:outline-none focus:border-black"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Box Image</label>
                <div className="flex items-center gap-4">
                  {formData.imageObj ? (
                    <div className="relative">
                      <img 
                        src={formData.imageObj.fileName ? getFileUrl(formData.imageObj.fileName) : formData.imageObj.url} 
                        alt="Box" 
                        className="w-20 h-20 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, imageId: null, imageObj: null})}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ) : formData.imageId ? (
                     <div className="w-20 h-20 bg-gray-100 rounded border flex items-center justify-center text-green-500">
                        <FaCheck />
                     </div>
                  ) : null}
                  
                  <button
                    type="button"
                    onClick={() => setIsMediaModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 border rounded hover:bg-gray-50 text-gray-700"
                  >
                    <FaImage /> {formData.imageId ? 'Change Image' : 'Select Image'}
                  </button>
                </div>
              </div>
              
              <div className="mb-6 flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="w-4 h-4"
                />
                <label htmlFor="isActive" className="text-gray-700 ml-2">Active</label>
              </div>
              
              <div className="flex justify-end" style={{ gap: '8px' }}>
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                  style={{ marginRight: '8px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <MediaPickerModal 
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        multiple={false}
        onSelect={(selected) => {
            if (selected && selected.length > 0) {
                setFormData({
                    ...formData,
                    imageId: parseInt(selected[0].id),
                    imageObj: selected[0]
                });
            }
        }}
      />
    </div>
  );
}
