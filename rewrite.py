import re

with open("src/app/admin/courses/page.tsx", "r") as f:
    lines = f.readlines()

new_ui = """        {/* Create form */}
        {showCreate && (
          <RevealSection>
            <section className="grid gap-8 xl:grid-cols-[1fr_400px]">
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between pb-2">
                  <div>
                    <h2 className="text-[24px] font-bold tracking-tight text-[#0f172a]">Create New Course</h2>
                    <p className="mt-1 text-[14px] text-[#64748b]">Configure your course details below. Changes are saved as a draft.</p>
                  </div>
                  <div className="flex items-center gap-2">
                     <Badge tone="neutral" className="bg-[#f1f5f9] text-[#475569] border-[#e2e8f0]">Draft Mode</Badge>
                  </div>
                </div>

                <form onSubmit={handleCreate} className="flex flex-col gap-6">
                  {/* Basic Details Card */}
                  <Surface className="overflow-hidden border border-[#e2e8f0] bg-white p-6 shadow-sm rounded-xl">
                    <h3 className="text-[16px] font-semibold text-[#0f172a] mb-5">Basic Details</h3>
                    <div className="grid gap-5">
                      <Field
                        required
                        label="Course Title"
                        onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g. Advanced React Patterns"
                        value={form.title}
                      />
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Subtitle" onChange={e => setForm(p => ({...p, subtitle: e.target.value}))} value={form.subtitle} placeholder="e.g. Master the fundamentals" />
                        <Field label="Category" onChange={e => setForm(p => ({...p, category: e.target.value}))} value={form.category} placeholder="e.g. Design" />
                        <Field label="Course Level" onChange={e => setForm(p => ({...p, courseLevel: e.target.value}))} value={form.courseLevel} placeholder="e.g. Beginner" />
                        <Field label="Language" onChange={e => setForm(p => ({...p, language: e.target.value}))} value={form.language} placeholder="e.g. English" />
                      </div>
                      <TextAreaField
                        label="Short description"
                        onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Summarize the promise, pace, and outcome."
                        rows={3}
                        value={form.description}
                      />
                      <TextAreaField
                        label="Overview Content"
                        onChange={(e) => setForm((prev) => ({ ...prev, overviewContent: e.target.value }))}
                        placeholder="Detailed paragraphs..."
                        rows={5}
                        value={form.overviewContent}
                      />
                    </div>
                  </Surface>

                  {/* Pricing Card */}
                  <Surface className="overflow-hidden border border-[#e2e8f0] bg-white p-6 shadow-sm rounded-xl">
                    <h3 className="text-[16px] font-semibold text-[#0f172a] mb-5">Pricing & Plans</h3>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field
                        label="Price (INR)"
                        onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                        placeholder="0"
                        type="number"
                        min={0}
                        value={form.price}
                      />
                      <Field label="Original Price (INR)" onChange={e => setForm(p => ({...p, originalPrice: e.target.value}))} value={form.originalPrice} placeholder="e.g. 2000" type="number" />
                    </div>

                    <div className="mt-6 pt-6 border-t border-[#f1f5f9]">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-[14px] font-medium text-[#0f172a]">Instalment Breakdown</p>
                        </div>
                        {!showAddInstalment && editingInstalmentIdx === null && (
                          <Button type="button" variant="secondary" size="sm" onClick={() => { setNewInstalment({ label: "", amount: "", dueDays: "" }); setShowAddInstalment(true); }}>
                            <Plus className="mr-1 h-3.5 w-3.5" /> Add instalment
                          </Button>
                        )}
                      </div>

                      <div className="overflow-hidden rounded-lg border border-[#e2e8f0] bg-white">
                        <table className="w-full text-[13px]">
                          <thead>
                            <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                              <th className="px-4 py-3 text-left font-medium text-[#64748b]">#</th>
                              <th className="px-4 py-3 text-left font-medium text-[#64748b]">Amount (₹)</th>
                              <th className="px-4 py-3 text-left font-medium text-[#64748b]">Due (days)</th>
                              <th className="px-4 py-3" />
                            </tr>
                          </thead>
                          <tbody>
                            {form.emiPlans.length === 0 && !showAddInstalment ? (
                              <tr>
                                <td colSpan={4} className="px-4 py-6 text-center text-[#94a3b8]">No instalments defined.</td>
                              </tr>
                            ) : (
                              form.emiPlans.map((plan, idx) => (
                                <tr key={idx} className={cx("border-b border-[#f1f5f9] last:border-0", editingInstalmentIdx === idx ? "bg-[#f8fafc]" : "")}>
                                  {editingInstalmentIdx === idx ? (
                                    <>
                                      <td className="px-4 py-2"><input autoFocus value={editInstalment.label} onChange={e => setEditInstalment(p => ({ ...p, label: e.target.value }))} className="w-full rounded-md border border-[#cbd5e1] px-2 py-1.5 outline-none focus:border-[#0f172a]" /></td>
                                      <td className="px-4 py-2"><input type="number" min={0} value={editInstalment.amount} onChange={e => setEditInstalment(p => ({ ...p, amount: e.target.value }))} className="w-24 rounded-md border border-[#cbd5e1] px-2 py-1.5 outline-none focus:border-[#0f172a]" /></td>
                                      <td className="px-4 py-2"><input type="number" min={0} value={editInstalment.dueDays} onChange={e => setEditInstalment(p => ({ ...p, dueDays: e.target.value }))} className="w-20 rounded-md border border-[#cbd5e1] px-2 py-1.5 outline-none focus:border-[#0f172a]" /></td>
                                      <td className="px-4 py-2 text-right">
                                        <div className="flex gap-1.5 justify-end">
                                          <Button type="button" size="sm" onClick={() => { setForm(p => ({ ...p, emiPlans: p.emiPlans.map((pl, i) => i === idx ? editInstalment : pl) })); setEditingInstalmentIdx(null); }}>Save</Button>
                                          <Button type="button" size="sm" variant="ghost" onClick={() => setEditingInstalmentIdx(null)}>Cancel</Button>
                                        </div>
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="px-4 py-3 text-[#0f172a]">{plan.label || `${idx + 1} instalment`}</td>
                                      <td className="px-4 py-3 text-[#0f172a]">₹{plan.amount ? Number(plan.amount).toLocaleString("en-IN") : 0}</td>
                                      <td className="px-4 py-3 text-[#64748b]">{plan.dueDays || 0} days</td>
                                      <td className="px-4 py-3 text-right">
                                        <div className="flex gap-1 justify-end">
                                          <button type="button" className="p-1.5 text-[#64748b] hover:text-[#0f172a]" onClick={() => { setEditInstalment({ ...plan }); setEditingInstalmentIdx(idx); }}><Pencil className="h-3.5 w-3.5" /></button>
                                          <button type="button" className="p-1.5 text-[#ef4444] hover:bg-[#fef2f2] rounded" onClick={() => setForm(p => ({ ...p, emiPlans: p.emiPlans.filter((_, i) => i !== idx) }))}><Trash2 className="h-3.5 w-3.5" /></button>
                                        </div>
                                      </td>
                                    </>
                                  )}
                                </tr>
                              ))
                            )}
                            
                            {showAddInstalment && (
                              <tr className="bg-[#f8fafc]">
                                <td className="px-4 py-2"><input autoFocus value={newInstalment.label} onChange={e => setNewInstalment(p => ({ ...p, label: e.target.value }))} className="w-full rounded-md border border-[#cbd5e1] px-2 py-1.5 outline-none focus:border-[#0f172a]" placeholder="Label" /></td>
                                <td className="px-4 py-2"><input type="number" min={0} value={newInstalment.amount} onChange={e => setNewInstalment(p => ({ ...p, amount: e.target.value }))} className="w-24 rounded-md border border-[#cbd5e1] px-2 py-1.5 outline-none focus:border-[#0f172a]" placeholder="Amount" /></td>
                                <td className="px-4 py-2"><input type="number" min={0} value={newInstalment.dueDays} onChange={e => setNewInstalment(p => ({ ...p, dueDays: e.target.value }))} className="w-20 rounded-md border border-[#cbd5e1] px-2 py-1.5 outline-none focus:border-[#0f172a]" placeholder="Days" /></td>
                                <td className="px-4 py-2 text-right">
                                  <div className="flex gap-1.5 justify-end">
                                    <Button type="button" size="sm" onClick={() => { if (!newInstalment.amount) return; setForm(p => ({ ...p, emiPlans: [...p.emiPlans, { label: newInstalment.label || `${p.emiPlans.length + 1} instalment`, amount: newInstalment.amount, dueDays: newInstalment.dueDays || '0' }] })); setNewInstalment({ label: "", amount: "", dueDays: "" }); setShowAddInstalment(false); }} disabled={!newInstalment.amount}>Add</Button>
                                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddInstalment(false)}>Cancel</Button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </Surface>

                  {/* Social Proof Card */}
                  <Surface className="overflow-hidden border border-[#e2e8f0] bg-white p-6 shadow-sm rounded-xl">
                    <h3 className="text-[16px] font-semibold text-[#0f172a] mb-5">Social Proof & FAQ</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[14px] font-medium text-[#0f172a]">Student Reviews</p>
                          <Button type="button" size="sm" variant="secondary" onClick={() => setShowAddTestimonial(!showAddTestimonial)}>
                            {showAddTestimonial ? "Cancel" : <><Plus className="mr-1 h-3.5 w-3.5" /> Add Review</>}
                          </Button>
                        </div>
                        
                        {showAddTestimonial && (
                          <div className="grid gap-3 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 mb-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <Field label="Student Name" value={newTestimonial.name} onChange={e => setNewTestimonial(p => ({...p, name: e.target.value}))} />
                              <Field label="Rating (1-5)" type="number" min={1} max={5} value={newTestimonial.rating} onChange={e => setNewTestimonial(p => ({...p, rating: e.target.value}))} />
                            </div>
                            <TextAreaField label="Review Text" value={newTestimonial.text} onChange={e => setNewTestimonial(p => ({...p, text: e.target.value}))} />
                            <Button type="button" size="sm" onClick={() => {
                              if (newTestimonial.name && newTestimonial.text) {
                                setForm(p => ({ ...p, testimonials: [...p.testimonials, newTestimonial] }));
                                setNewTestimonial({ name: "", text: "", rating: "5" });
                                setShowAddTestimonial(false);
                              }
                            }}>Add Review</Button>
                          </div>
                        )}

                        {form.testimonials.length > 0 && (
                          <div className="rounded-lg border border-[#e2e8f0] bg-white divide-y divide-[#f1f5f9]">
                            {form.testimonials.map((t, idx) => (
                              <div key={idx} className="p-4 flex items-start justify-between gap-4">
                                {editingTestimonialIdx === idx ? (
                                  <div className="grid gap-3 w-full">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <Field label="Student Name" value={editTestimonial.name} onChange={e => setEditTestimonial(p => ({...p, name: e.target.value}))} />
                                      <Field label="Rating" type="number" min={1} max={5} value={editTestimonial.rating} onChange={e => setEditTestimonial(p => ({...p, rating: e.target.value}))} />
                                    </div>
                                    <TextAreaField label="Review Text" value={editTestimonial.text} onChange={e => setEditTestimonial(p => ({...p, text: e.target.value}))} />
                                    <div className="flex gap-2">
                                      <Button type="button" size="sm" onClick={() => {
                                        const updated = [...form.testimonials];
                                        updated[idx] = editTestimonial;
                                        setForm(p => ({ ...p, testimonials: updated }));
                                        setEditingTestimonialIdx(null);
                                      }}>Save</Button>
                                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingTestimonialIdx(null)}>Cancel</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div>
                                      <p className="text-[14px] font-semibold text-[#0f172a]">{t.name} <span className="text-[#f59e0b] font-normal">({t.rating}★)</span></p>
                                      <p className="mt-1 text-[13px] text-[#475569]">"{t.text}"</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button type="button" className="p-1.5 text-[#64748b] hover:text-[#0f172a]" onClick={() => { setEditTestimonial(t); setEditingTestimonialIdx(idx); }}>
                                        <Pencil className="h-4 w-4" />
                                      </button>
                                      <button type="button" className="p-1.5 text-[#ef4444] hover:bg-[#fef2f2] rounded" onClick={() => setForm(p => ({ ...p, testimonials: p.testimonials.filter((_, i) => i !== idx) }))}>
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-[#f1f5f9]">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[14px] font-medium text-[#0f172a]">FAQs</p>
                          <Button type="button" size="sm" variant="secondary" onClick={() => setShowAddFaq(!showAddFaq)}>
                            {showAddFaq ? "Cancel" : <><Plus className="mr-1 h-3.5 w-3.5" /> Add FAQ</>}
                          </Button>
                        </div>
                        
                        {showAddFaq && (
                          <div className="grid gap-3 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 mb-4">
                            <Field label="Question" value={newFaq.question} onChange={e => setNewFaq(p => ({...p, question: e.target.value}))} />
                            <TextAreaField label="Answer" value={newFaq.answer} onChange={e => setNewFaq(p => ({...p, answer: e.target.value}))} />
                            <Button type="button" size="sm" onClick={() => {
                              if (newFaq.question && newFaq.answer) {
                                setForm(p => ({ ...p, faqs: [...p.faqs, newFaq] }));
                                setNewFaq({ question: "", answer: "" });
                                setShowAddFaq(false);
                              }
                            }}>Add FAQ</Button>
                          </div>
                        )}

                        {form.faqs.length > 0 && (
                          <div className="rounded-lg border border-[#e2e8f0] bg-white divide-y divide-[#f1f5f9]">
                            {form.faqs.map((f, idx) => (
                              <div key={idx} className="p-4 flex items-start justify-between gap-4">
                                {editingFaqIdx === idx ? (
                                  <div className="grid gap-3 w-full">
                                    <Field label="Question" value={editFaq.question} onChange={e => setEditFaq(p => ({...p, question: e.target.value}))} />
                                    <TextAreaField label="Answer" value={editFaq.answer} onChange={e => setEditFaq(p => ({...p, answer: e.target.value}))} />
                                    <div className="flex gap-2">
                                      <Button type="button" size="sm" onClick={() => {
                                        const updated = [...form.faqs];
                                        updated[idx] = editFaq;
                                        setForm(p => ({ ...p, faqs: updated }));
                                        setEditingFaqIdx(null);
                                      }}>Save</Button>
                                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingFaqIdx(null)}>Cancel</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div>
                                      <p className="text-[14px] font-semibold text-[#0f172a]">Q: {f.question}</p>
                                      <p className="mt-1 text-[13px] text-[#475569]">A: {f.answer}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button type="button" className="p-1.5 text-[#64748b] hover:text-[#0f172a]" onClick={() => { setEditFaq(f); setEditingFaqIdx(idx); }}>
                                        <Pencil className="h-4 w-4" />
                                      </button>
                                      <button type="button" className="p-1.5 text-[#ef4444] hover:bg-[#fef2f2] rounded" onClick={() => setForm(p => ({ ...p, faqs: p.faqs.filter((_, i) => i !== idx) }))}>
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Surface>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 mt-2 mb-8">
                    {error && <p className="text-[13px] font-medium text-[#dc2626] mr-auto">{error}</p>}
                    <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                    <Button type="submit" loading={saving}>{saving ? "Creating…" : "Create Course"}</Button>
                  </div>
                </form>
              </div>

              {/* Right Sidebar */}
              <div className="sticky top-6 self-start space-y-6">
                {/* Course Preview Card */}
                <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-xl shadow-black/[0.03]">
                  <div className="relative aspect-[16/9] w-full bg-slate-100 overflow-hidden">
                    {form.thumbnail ? (
                      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${form.thumbnail})` }} />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-slate-100 to-slate-200">
                        <ImagePlus className="h-8 w-8 text-slate-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-5 text-white w-full">
                      <Badge className="bg-white/20 text-white backdrop-blur-md border-white/10 mb-3">{form.category || "Category"}</Badge>
                      <h3 className="text-xl font-bold leading-tight">{form.title.trim() || "Course Title Preview"}</h3>
                      <p className="mt-1.5 text-sm text-white/80 line-clamp-2">{form.description.trim() || "Course description will appear here..."}</p>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-900">{priceLabel}</span>
                      <span className="text-slate-500">{form.totalHours ? `${form.totalHours} hours` : "Duration"}</span>
                    </div>
                  </div>
                </div>

                {/* Settings & Thumbnail Form */}
                <Surface className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
                  <h4 className="font-semibold text-slate-900 mb-4">Media & Settings</h4>
                  <div className="space-y-5">
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-2">Thumbnail Upload</label>
                      <div className="flex flex-col gap-3">
                        <Button type="button" variant="secondary" className="w-full" loading={thumbnailUploading} onClick={() => thumbnailInputRef.current?.click()}>
                          {thumbnailUploading ? "Uploading…" : "Upload Image"}
                        </Button>
                        <input
                          ref={thumbnailInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.currentTarget.value = "";
                            if (file) void handleThumbnailFileChange(file);
                          }}
                        />
                        {thumbnailUploadError && <p className="text-xs text-red-500">{thumbnailUploadError}</p>}
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                          <div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-slate-400">or use URL</span></div>
                        </div>
                        <Field value={form.thumbnail} onChange={(e) => setForm((p) => ({ ...p, thumbnail: e.target.value }))} placeholder="https://..." />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <label className="text-sm font-medium text-slate-700 block mb-2">Assigned Teachers</label>
                      <div className="max-h-[160px] overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                        {teachers.length === 0 ? (
                          <p className="text-sm text-slate-500">No teachers found.</p>
                        ) : (
                          teachers.map((teacher) => {
                            const isSelected = form.teacherIds.includes(teacher.id);
                            return (
                              <button
                                key={teacher.id}
                                type="button"
                                onClick={() => setForm((p) => ({ ...p, teacherIds: isSelected ? p.teacherIds.filter((id) => id !== teacher.id) : [...p.teacherIds, teacher.id] }))}
                                className={cx("flex w-full items-center justify-between rounded-lg border p-2.5 text-left text-sm transition-all", isSelected ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-300")}
                              >
                                <span className={cx("font-medium", isSelected ? "text-slate-900" : "text-slate-600")}>{getTeacherDisplayName(teacher)}</span>
                                {isSelected && <Check className="h-4 w-4 text-slate-900" />}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </Surface>
              </div>
            </section>
          </RevealSection>
        )}"""

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if "{/* Create form */}" in line:
        start_idx = i
    if "        {/* Stats */}" in line:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    lines[start_idx:end_idx] = [new_ui + "\n\n"]
    with open("src/app/admin/courses/page.tsx", "w") as f:
        f.writelines(lines)
    print("Successfully replaced the create form section.")
else:
    print(f"Could not find boundaries. start_idx: {start_idx}, end_idx: {end_idx}")
