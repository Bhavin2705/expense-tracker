window.groupCard = {
  render(group) {
    return `<div class="group-card" data-group-id="${group._id}"><div><h3>${group.name}</h3><p>${group.description || "No description"}</p></div><div class="group-meta"><span class="tag">${group.participantCount || 0} participants</span><span class="tag">${group.currency || "INR"}</span><span class="tag ${group.isArchived ? 'archived' : 'active'}">${group.isArchived ? "Archived" : "Active"}</span></div></div>`;
  }
};
