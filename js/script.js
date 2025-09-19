// --- APP INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Only run the builder script on the builder page
    if (document.getElementById('resume-form')) {
        console.log("Builder page detected. Initializing script...");
        new ResumeBuilder();
    }
});

class ResumeBuilder {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 5;
        this.elements = {}; // To store all DOM elements
        this.debounceTimer = null; // For debouncing local storage saves

        this.collectElements();
        this.setupEventListeners();
        this.generateTemplatePreviews();
        this.loadData();
        this.updateStepUI();
        this.updateResumePreview();
        console.log("Initialization complete. Live preview is active.");
    }

    // --- SETUP ---
    collectElements() {
        this.elements = {
            form: document.getElementById('resume-form'),
            formSection: document.getElementById('form-section'),
            steps: document.querySelectorAll('.step'),
            stepContents: document.querySelectorAll('.step-content'),
            prevBtn: document.getElementById('prev-btn'),
            nextBtn: document.getElementById('next-btn'),
            progressFill: document.getElementById('progress-fill'),
            resumePreview: document.getElementById('resume-preview'),
            experienceContainer: document.getElementById('experience-container'),
            educationContainer: document.getElementById('education-container'),
            templatePreviewsContainer: document.querySelector('.template-previews'),
            addExperienceBtn: document.getElementById('add-experience'),
            addEducationBtn: document.getElementById('add-education'),
            downloadPdfBtn: document.getElementById('download-pdf'),
            downloadDocBtn: document.getElementById('download-doc')
        };
    }

    setupEventListeners() {
        // Form input triggers debounced save and immediate preview update
        this.elements.form.addEventListener('input', () => {
            this.updateResumePreview();
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => this.saveDataToLocalStorage(), 300);
        });

        // Focus listeners for highlighting the preview
        this.elements.form.addEventListener('focusin', this.handleFocusIn.bind(this));
        this.elements.form.addEventListener('focusout', this.handleFocusOut.bind(this));

        // Navigation
        this.elements.nextBtn.addEventListener('click', this.nextStep.bind(this));
        this.elements.prevBtn.addEventListener('click', this.prevStep.bind(this));
        this.elements.steps.forEach(step => {
            step.addEventListener('click', (e) => {
                const stepNum = parseInt(e.currentTarget.dataset.step);
                if (stepNum < this.currentStep || step.classList.contains('completed')) {
                    this.currentStep = stepNum;
                    this.updateStepUI();
                }
            });
        });

        // Buttons
        this.elements.addExperienceBtn.addEventListener('click', () => this.addRepeaterItem('experience'));
        this.elements.addEducationBtn.addEventListener('click', () => this.addRepeaterItem('education'));
        this.elements.downloadPdfBtn.addEventListener('click', this.downloadPDF.bind(this));
        this.elements.downloadDocBtn.addEventListener('click', this.downloadDOC.bind(this));

        // Dynamic item removal (using event delegation)
        this.elements.experienceContainer.addEventListener('click', (e) => this.handleRemoveItem(e));
        this.elements.educationContainer.addEventListener('click', (e) => this.handleRemoveItem(e));

        // Template selection
        this.elements.templatePreviewsContainer.addEventListener('click', (e) => {
            const card = e.target.closest('.template-preview-card');
            if (card) {
                this.elements.templatePreviewsContainer.querySelector('.active').classList.remove('active');
                card.classList.add('active');
                this.applyTemplate(card.dataset.template);
                this.saveDataToLocalStorage(); // Save selected template
            }
        });
    }

    // --- DATA MANAGEMENT (LOCAL STORAGE & JSON) ---
    getFormDataAsObject() {
        const data = {};
        ['fullName', 'jobTitle', 'email', 'phone', 'location', 'linkedin', 'website', 'summary', 'skills'].forEach(name => {
            const element = this.elements.form.elements[name];
            if (element) {
                data[name] = element.value;
            }
        });

        data.experience = Array.from(this.elements.experienceContainer.querySelectorAll('.repeater-item')).map(item => ({
            title: item.querySelector('[name="experience-title"]').value,
            company: item.querySelector('[name="experience-company"]').value,
            dates: item.querySelector('[name="experience-dates"]').value,
            description: item.querySelector('[name="experience-description"]').value,
        }));
        data.education = Array.from(this.elements.educationContainer.querySelectorAll('.repeater-item')).map(item => ({
            degree: item.querySelector('[name="education-degree"]').value,
            school: item.querySelector('[name="education-school"]').value,
            dates: item.querySelector('[name="education-dates"]').value,
        }));
        const activeTemplate = this.elements.templatePreviewsContainer.querySelector('.active');
        data.template = activeTemplate ? activeTemplate.dataset.template : '1';
        return data;
    }

    populateForm(data) {
        if (!data) return;
        Object.keys(data).forEach(key => {
            const field = this.elements.form.querySelector(`[name="${key}"]`);
            if (field) field.value = data[key];
        });

        this.elements.experienceContainer.innerHTML = '';
        if (data.experience && data.experience.length > 0) {
            data.experience.forEach(exp => this.addRepeaterItem('experience', exp));
        } else {
            this.addRepeaterItem('experience'); // Add one empty if none exist
        }

        this.elements.educationContainer.innerHTML = '';
        if (data.education && data.education.length > 0) {
            data.education.forEach(edu => this.addRepeaterItem('education', edu));
        } else {
             this.addRepeaterItem('education'); // Add one empty if none exist
        }

        this.applyTemplate(data.template || '1');
        this.updateResumePreview();
    }
    
    saveDataToLocalStorage() {
        const data = this.getFormDataAsObject();
        localStorage.setItem('resumeData', JSON.stringify(data));
        console.log("Data saved to Local Storage.");
    }

    loadDataFromLocalStorage() {
        const savedData = localStorage.getItem('resumeData');
        if (savedData) {
            console.log("Found data in Local Storage. Loading...");
            this.populateForm(JSON.parse(savedData));
        } else {
            this.addInitialRepeaterItems();
        }
    }

    loadData() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('new') === 'true') {
            localStorage.removeItem('resumeData');
            this.elements.form.reset();
            this.elements.experienceContainer.innerHTML = '';
            this.elements.educationContainer.innerHTML = '';
            this.addInitialRepeaterItems();
            this.currentStep = 1;
            this.updateStepUI();
            this.updateResumePreview();
            this.applyTemplate('1');
        } else {
            this.loadDataFromLocalStorage();
        }
    }

    // --- UI & PREVIEW ---
    updateStepUI() {
        this.elements.steps.forEach((step, index) => {
            step.classList.toggle('active', index + 1 === this.currentStep);
            step.classList.toggle('completed', index + 1 < this.currentStep);
        });
        this.elements.stepContents.forEach(content => content.classList.remove('active'));
        this.elements.form.querySelector(`#step-${this.currentStep}`).classList.add('active');
        this.elements.progressFill.style.width = `${((this.currentStep - 1) / (this.totalSteps - 1)) * 100}%`;
        this.elements.prevBtn.style.display = this.currentStep === 1 ? 'none' : 'inline-flex';
        this.elements.nextBtn.innerHTML = this.currentStep === this.totalSteps ? 'Finish <i class="fas fa-check"></i>' : 'Next <i class="fas fa-arrow-right"></i>';
    }

    nextStep() {
        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.updateStepUI();
            this.elements.formSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepUI();
            this.elements.formSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    updateResumePreview() {
        const data = this.getFormDataAsObject();
        if (!data.fullName && !data.jobTitle && !data.email) {
            this.elements.resumePreview.innerHTML = `<div class="placeholder-text"><i class="fas fa-file-alt fa-3x"></i><h3>Your Resume Preview</h3><p>Start typing to see your resume appear here!</p></div>`;
            return;
        }

        let html = `
            <div class="resume-header"><h1 class="resume-name">${data.fullName || ''}</h1><h2 class="resume-title">${data.jobTitle || ''}</h2><div class="resume-contact">
                ${data.email ? `<span id="contact-email"><i class="fas fa-envelope"></i> ${data.email}</span>` : ''}
                ${data.phone ? `<span id="contact-phone"><i class="fas fa-phone"></i> ${data.phone}</span>` : ''}
                ${data.location ? `<span id="contact-location"><i class="fas fa-map-marker-alt"></i> ${data.location}</span>` : ''}
                ${data.linkedin ? `<span id="contact-linkedin"><i class="fab fa-linkedin"></i> ${data.linkedin.replace(/^(https?:\/\/)?(www\.)?/, '')}</span>` : ''}
                ${data.website ? `<span id="contact-website"><i class="fas fa-globe"></i> ${data.website.replace(/^(https?:\/\/)?(www\.)?/, '')}</span>` : ''}
            </div></div>`;
        if (data.summary) html += `<div class="resume-section" id="summary-section"><h3 class="resume-section-title">Summary</h3><p>${data.summary.replace(/\n/g, '<br>')}</p></div>`;
        if (data.experience && data.experience.some(e => e.title)) {
            html += `<div class="resume-section" id="experience-section"><h3 class="resume-section-title">Experience</h3>`;
            data.experience.forEach((exp, i) => {
                if (exp.title) html += `<div class="experience-item" data-index="${i}"><div class="item-header"><div class="item-title">${exp.title}</div><div class="item-date">${exp.dates}</div></div><div class="item-subtitle">${exp.company}</div><div class="item-description"><p>${exp.description.replace(/\n/g, '<br>')}</p></div></div>`;
            });
            html += `</div>`;
        }
        if (data.education && data.education.some(e => e.degree)) {
            html += `<div class="resume-section" id="education-section"><h3 class="resume-section-title">Education</h3>`;
            data.education.forEach((edu, i) => {
                if (edu.degree) html += `<div class="education-item" data-index="${i}"><div class="item-header"><div class="item-title">${edu.degree}</div><div class="item-date">${edu.dates}</div></div><div class="item-subtitle">${edu.school}</div></div>`;
            });
            html += `</div>`;
        }
        if (data.skills) html += `<div class="resume-section" id="skills-section"><h3 class="resume-section-title">Skills</h3><div class="skills-container">${data.skills.split(',').map(s => s.trim()).filter(Boolean).map(skill => `<span class="skill-badge">${skill}</span>`).join('')}</div></div>`;
        this.elements.resumePreview.innerHTML = html;
    }
    
    applyTemplate(templateNumber = '1') {
        this.elements.resumePreview.className = `resume-preview template-${templateNumber}`;
        const activeCard = this.elements.templatePreviewsContainer.querySelector(`[data-template="${templateNumber}"]`);
        if(activeCard) {
            const currentActive = this.elements.templatePreviewsContainer.querySelector('.active');
            if (currentActive) currentActive.classList.remove('active');
            activeCard.classList.add('active');
        }
    }
    
    generateTemplatePreviews() {
        const templates = [
            { id: 1, name: "Classic", image: "claasic.jpeg" },
            { id: 2, name: "Modern", image: "modern.jpeg" },
            { id: 3, name: "Minimal", image: "minimal.jpeg" },
            { id: 4, name: "Creative", image: "creative.jpeg" },
            { id: 5, name: "Professional", image: "professonal.jpeg" },
            { id: 6, name: "Elegant", image: "elegent.jpeg" },
            { id: 7, name: "Tech", image: "black tech.jpeg" },
            { id: 8, name: "Bold", image: "bold.jpeg" },
            { id: 9, name: "Clean", image: "clean.jpeg" },
            { id: 10, name: "Contemporary", image: "contemperory.jpeg" }
        ];
        let html = '';
        templates.forEach(t => {
            html += `<div class="template-preview-card ${t.id === 1 ? 'active' : ''}" data-template="${t.id}">
                        <img src="img/${t.image}" alt="${t.name} template preview" class="template-image">
                        <div class="template-name">${t.name}</div>
                     </div>`;
        });
        this.elements.templatePreviewsContainer.innerHTML = html;
    }

    // --- REPEATER ITEMS (Experience/Education) ---
    addInitialRepeaterItems() {
        if (this.elements.experienceContainer.children.length === 0) this.addRepeaterItem('experience');
        if (this.elements.educationContainer.children.length === 0) this.addRepeaterItem('education');
    }

    addRepeaterItem(type, data = {}) {
        const container = type === 'experience' ? this.elements.experienceContainer : this.elements.educationContainer;
        const item = document.createElement('div');
        item.className = 'repeater-item';
        const fields = type === 'experience' ?
            `<div class="form-group"><label>Job Title</label><input type="text" class="form-control" name="experience-title" value="${data.title || ''}"></div>
             <div class="form-group"><label>Company</label><input type="text" class="form-control" name="experience-company" value="${data.company || ''}"></div>
             <div class="form-group"><label>Dates</label><input type="text" class="form-control" name="experience-dates" value="${data.dates || ''}"></div>
             <div class="form-group"><label>Description</label><textarea class="form-control" name="experience-description">${data.description || ''}</textarea></div>` :
            `<div class="form-group"><label>Degree</label><input type="text" class="form-control" name="education-degree" value="${data.degree || ''}"></div>
             <div class="form-group"><label>School</label><input type="text" class="form-control" name="education-school" value="${data.school || ''}"></div>
             <div class="form-group"><label>Dates</label><input type="text" class="form-control" name="education-dates" value="${data.dates || ''}"></div>`;
        item.innerHTML = `<button type="button" class="remove-item" aria-label="Remove item">&times;</button>${fields}`;
        container.appendChild(item);
    }
    
    handleRemoveItem(e) {
        if (e.target.classList.contains('remove-item')) {
            e.target.closest('.repeater-item').remove();
            this.updateResumePreview();
            this.saveDataToLocalStorage();
        }
    }

    // --- HIGHLIGHTING ---
    handleFocusIn(e) {
        const target = e.target;
        if (target.matches('.form-control')) {
            let previewTargetSelector = target.dataset.previewTarget;
            const repeaterItem = target.closest('.repeater-item');
            if (repeaterItem) {
                const parentContainer = repeaterItem.parentElement;
                const index = Array.from(parentContainer.children).indexOf(repeaterItem);
                const previewContainerId = parentContainer.dataset.previewTarget;
                previewTargetSelector = `${previewContainerId} [data-index="${index}"]`;
            }
            
            if (previewTargetSelector) {
                const previewElement = this.elements.resumePreview.querySelector(previewTargetSelector);
                if (previewElement) {
                    previewElement.classList.add('preview-highlight');
                    previewElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    }

    handleFocusOut() {
        const highlighted = this.elements.resumePreview.querySelector('.preview-highlight');
        if (highlighted) {
            highlighted.classList.remove('preview-highlight');
        }
    }
    
    // --- DOWNLOADS ---
    downloadPDF() {
        const node = this.elements.resumePreview;
        const button = this.elements.downloadPdfBtn;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        button.disabled = true;

        domtoimage.toPng(node, {
            quality: 1.0,
            bgcolor: '#ffffff',
            width: node.scrollWidth,
            height: node.scrollHeight
        }).then(dataUrl => {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const img = new Image();
            img.src = dataUrl;
            img.onload = () => {
                const imgWidth = img.width;
                const imgHeight = img.height;
                const ratio = imgWidth / imgHeight;
                const finalHeight = pdfWidth / ratio;
                pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, finalHeight);
                pdf.save('resume.pdf');
            }
        }).catch(error => {
            console.error('PDF generation failed:', error);
            alert('Sorry, there was an error creating the PDF. Please try again.');
        }).finally(() => {
            button.innerHTML = '<i class="fas fa-file-pdf"></i> Download PDF';
            button.disabled = false;
        });
    }

    downloadDOC() {
        const templateStyles = `
            <style>
                body{font-family:Arial,sans-serif;font-size:12pt;color:#333;}
                h1{font-size:24pt;color:#0056b3;margin:0;} h2{font-size:14pt;color:#0056b3;margin-top:0;}
                h3{font-size:14pt;border-bottom:1px solid #ccc;padding-bottom:2px;margin-top:20px;}
                p{margin:5px 0;} .resume-contact{display:flex;justify-content:center;gap:20px;margin:10px 0;}
                .item-header{display:flex;justify-content:space-between;} .item-title{font-weight:bold;}
                .skills-container { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
                .skill-badge { display: inline-block; background-color: #e0e0e0; color: #333; padding: 5px 12px; border-radius: 15px; font-size: 10pt; margin: 2px; }
            </style>`;
        const content = `<!DOCTYPE html><html><head><meta charset="UTF-8">${templateStyles}</head><body>${this.elements.resumePreview.innerHTML}</body></html>`;
        const blob = new Blob([content], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'resume.doc';
        a.click();
        URL.revokeObjectURL(url);
    }
}