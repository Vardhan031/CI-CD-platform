import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderGit2,
  Plus,
  GitBranch,
  ExternalLink,
  Server,
  Trash2,
  Edit,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Box,
} from 'lucide-react';
import * as projectService from '../services/projectService';
import { useAuth } from '../context/AuthContext';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { user } = useAuth();

  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    repositoryUrl: '',
    branch: 'main',
    dockerfilePath: 'Dockerfile',
    port: 3000,
    environment: 'development',
  });

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await projectService.getProjects();
      setProjects(data.projects || []);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setError('Could not load project repository list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleInputChange = (e) => {
    setNewProject({ ...newProject, [e.target.name]: e.target.value });
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      await projectService.createProject(newProject);
      setIsModalOpen(false);
      setNewProject({
        name: '',
        description: '',
        repositoryUrl: '',
        branch: 'main',
        dockerfilePath: 'Dockerfile',
        port: 3000,
        environment: 'development',
      });
      fetchProjects();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create project');
    }
  };

  const handleDeleteProject = async (id, name) => {
    if (window.confirm(`Are you sure you want to unregister project "${name}"?`)) {
      try {
        await projectService.deleteProject(id);
        fetchProjects();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete project');
      }
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.repositoryUrl.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Top Banner & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
            <FolderGit2 className="text-cyan-400" />
            <span>GitHub Projects</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Register GitHub repositories to automate continuous integration & containerized deployments.
          </p>
        </div>

        {user?.role !== 'VIEWER' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-2 shrink-0"
          >
            <Plus size={18} />
            <span>Register Project</span>
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-3 text-slate-500" size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search projects by name or repository URL..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
        />
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm font-mono">
          Loading project repositories...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
          <Box className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-semibold text-slate-300">No Projects Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? 'No projects matching your search term.'
              : 'Register your first GitHub repository to start setting up CI/CD pipelines.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project._id || project.id}
              className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 hover:border-slate-700 transition-all flex flex-col justify-between space-y-5 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <Link
                      to={`/projects/${project._id || project.id}`}
                      className="text-lg font-bold text-slate-100 hover:text-cyan-400 transition-colors flex items-center space-x-2"
                    >
                      <span>{project.name}</span>
                    </Link>
                    <span className="text-xs text-slate-400 font-mono block">
                      Port: <span className="text-cyan-400">{project.port}</span>
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold font-mono border ${
                      project.status === 'DEPLOYED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : project.status === 'BUILDING'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : project.status === 'FAILED'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {project.status || 'IDLE'}
                  </span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2">
                  {project.description || 'No description provided.'}
                </p>

                <div className="pt-2 space-y-2 text-xs font-mono text-slate-400">
                  <div className="flex items-center space-x-2 truncate">
                    <FolderGit2 size={14} className="text-slate-500 shrink-0" />
                    <a
                      href={project.repositoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-cyan-400 truncate flex items-center space-x-1"
                    >
                      <span>{project.repositoryUrl}</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center space-x-1">
                      <GitBranch size={14} className="text-slate-500" />
                      <span>{project.branch || 'main'}</span>
                    </span>

                    <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">
                      {project.environment || 'development'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <Link
                  to={`/projects/${project._id || project.id}`}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                >
                  <span>View Pipeline</span>
                  <span>→</span>
                </Link>

                {user?.role !== 'VIEWER' && (
                  <button
                    onClick={() => handleDeleteProject(project._id || project.id, project.name)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Delete Project"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Project Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <Plus className="text-cyan-400" />
                <span>Register GitHub Repository</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={newProject.name}
                  onChange={handleInputChange}
                  placeholder="e.g. NodeShop API"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  GitHub Repository URL
                </label>
                <input
                  type="url"
                  name="repositoryUrl"
                  required
                  value={newProject.repositoryUrl}
                  onChange={handleInputChange}
                  placeholder="https://github.com/username/nodeshop.git"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Target Branch
                  </label>
                  <input
                    type="text"
                    name="branch"
                    value={newProject.branch}
                    onChange={handleInputChange}
                    placeholder="main"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Container Port
                  </label>
                  <input
                    type="number"
                    name="port"
                    required
                    value={newProject.port}
                    onChange={handleInputChange}
                    placeholder="3000"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Dockerfile Location
                  </label>
                  <input
                    type="text"
                    name="dockerfilePath"
                    value={newProject.dockerfilePath}
                    onChange={handleInputChange}
                    placeholder="Dockerfile"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Environment
                  </label>
                  <select
                    name="environment"
                    value={newProject.environment}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="development">development</option>
                    <option value="staging">staging</option>
                    <option value="production">production</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={2}
                  value={newProject.description}
                  onChange={handleInputChange}
                  placeholder="Brief summary of application services..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-cyan-500/20"
                >
                  Register Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
