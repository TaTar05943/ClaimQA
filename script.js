document.addEventListener('DOMContentLoaded', () => {
    const customerGroups = [
        {
            id: 'barrel',
            item: 'Barrel',
            models: ['AH14', 'AH15', 'AH16N', 'AH16A', 'AH16C', 'AH31', 'AH35', 'AH44'],
            ppmTarget: 10000,
            containerId: 'barrel-models',
            overallResultsId: 'overallBarrelResults'
        },
        {
            id: 'lower',
            item: 'Lower',
            models: ['AH25', 'AH26', 'AH43'],
            ppmTarget: 5000,
            containerId: 'lower-models',
            overallResultsId: 'overallLowerResults'
        }
    ];

    const calculateBtn = document.getElementById('calculateBtn');
    const saveDataBtn = document.getElementById('saveDataBtn');
    const loadHistoryBtn = document.getElementById('loadHistoryBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const resultsOutput = document.getElementById('resultsOutput');
    const historyList = document.getElementById('historyList');
    const clearAllHistoryBtn = document.getElementById('clearAllHistoryBtn');

    // Toasts
    const liveToast = document.getElementById('liveToast');
    const toastBootstrap = bootstrap.Toast.getOrCreateInstance(liveToast);
    const successToast = document.getElementById('successToast');
    const successToastBootstrap = bootstrap.Toast.getOrCreateInstance(successToast);
    const successToastBody = document.getElementById('successToastBody');

    const LOCAL_STORAGE_KEY = 'claim_data_history'; // Key for localStorage

    // --- ฟังก์ชันสำหรับสร้างช่องกรอกข้อมูล ---
    function createInputFields(group) {
        const container = document.getElementById(group.containerId);
        container.innerHTML = ''; // Clear existing inputs if any
        group.models.forEach(model => {
            const entryDiv = document.createElement('div');
            entryDiv.classList.add('col-md-6', 'col-lg-4');
            entryDiv.innerHTML = `
                <div class="input-group mb-3">
                    <span class="input-group-text">${model}</span>
                    <input type="number" id="${group.id}-${model}-claim" class="form-control" placeholder="ยอดเคลม" min="0">
                    <input type="number" id="${group.id}-${model}-sale" class="form-control" placeholder="ยอดขาย" min="0">
                </div>
            `;
            container.appendChild(entryDiv);
        });
    }

    // สร้างช่องกรอกข้อมูลสำหรับทุกกลุ่ม
    customerGroups.forEach(group => createInputFields(group));

    // --- Helper function to get current input data ---
    function getCurrentInputData() {
        const data = {};
        customerGroups.forEach(group => {
            data[group.id] = {};
            group.models.forEach(model => {
                const claimInput = document.getElementById(`${group.id}-${model}-claim`);
                const saleInput = document.getElementById(`${group.id}-${model}-sale`);
                data[group.id][model] = {
                    claim: claimInput.value === '' ? '' : parseFloat(claimInput.value),
                    sale: saleInput.value === '' ? '' : parseFloat(saleInput.value)
                };
            });
        });
        return data;
    }

    // --- Helper function to set input data ---
    function setInputData(data) {
        customerGroups.forEach(group => {
            group.models.forEach(model => {
                const claimInput = document.getElementById(`${group.id}-${model}-claim`);
                const saleInput = document.getElementById(`${group.id}-${model}-sale`);

                if (data[group.id] && data[group.id][model]) {
                    claimInput.value = data[group.id][model].claim !== '' ? data[group.id][model].claim : '';
                    saleInput.value = data[group.id][model].sale !== '' ? data[group.id][model].sale : '';
                } else {
                    claimInput.value = '';
                    saleInput.value = '';
                }
                // Clear validation states after setting new data
                claimInput.classList.remove('is-invalid', 'is-valid');
                saleInput.classList.remove('is-invalid', 'is-valid');
            });
        });
        // Trigger calculation after loading data
        calculatePPM();
    }

    // --- ฟังก์ชันหลักสำหรับคำนวณ PPM ทั้งหมด ---
    let latestCalculatedResults = {
        individual: {},
        overall: {}
    }; // Store latest results for export

    function calculatePPM() {
        resultsOutput.innerHTML = ''; // Clear previous individual results
        document.getElementById('overallBarrelResults').innerHTML = '<p class="text-muted text-center py-3">ยังไม่มีข้อมูลสำหรับ TH Barrel.</p>';
        document.getElementById('overallLowerResults').innerHTML = '<p class="text-muted text-center py-3">ยังไม่มีข้อมูลสำหรับ TH Lower.</p>';

        latestCalculatedResults = {
            individual: {},
            overall: {}
        };
        let hasAnyValidInputOverall = false;
        let hasErrorOccurred = false;

        customerGroups.forEach(group => {
            let totalClaim = 0;
            let totalSale = 0;
            let hasValidInputInGroup = false;
            latestCalculatedResults.individual[group.id] = {};

            group.models.forEach(model => {
                const claimInput = document.getElementById(`${group.id}-${model}-claim`);
                const saleInput = document.getElementById(`${group.id}-${model}-sale`);

                claimInput.classList.remove('is-invalid', 'is-valid');
                saleInput.classList.remove('is-invalid', 'is-valid');

                const claimValue = claimInput.value.trim();
                const saleValue = saleInput.value.trim();

                let claim = 0;
                let sale = 0;
                let isValidForThisModel = true;

                if (claimValue !== '') {
                    claim = parseFloat(claimValue);
                    if (isNaN(claim) || claim < 0) {
                        isValidForThisModel = false;
                        claimInput.classList.add('is-invalid');
                        hasErrorOccurred = true;
                    } else {
                        claimInput.classList.add('is-valid');
                    }
                }

                if (saleValue !== '') {
                    sale = parseFloat(saleValue);
                    if (isNaN(sale) || sale < 0) {
                        isValidForThisModel = false;
                        saleInput.classList.add('is-invalid');
                        hasErrorOccurred = true;
                    } else {
                        saleInput.classList.add('is-valid');
                    }
                }

                if (!isValidForThisModel) {
                    return; // Skip this model's calculation and display if there's an error
                }

                if (claimValue !== '' || saleValue !== '') {
                    totalClaim += claim;
                    totalSale += sale;
                    hasValidInputInGroup = true;
                    hasAnyValidInputOverall = true;
                }

                let ppm = 0;
                if (sale > 0) {
                    ppm = (claim * 1000000) / sale;
                } else if (claim > 0 && sale === 0) {
                    ppm = Infinity; // Claim exists but sale is 0, indicates very high PPM
                }

                latestCalculatedResults.individual[group.id][model] = {
                    claim: claim,
                    sale: sale,
                    ppm: isFinite(ppm) ? parseFloat(ppm.toFixed(2)) : 'Infinity'
                };

                if (claimValue !== '' || saleValue !== '') {
                    const resultDiv = document.createElement('div');
                    resultDiv.classList.add('alert', ppm === Infinity || ppm > group.ppmTarget ? 'alert-danger' : 'alert-success', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-2');
                    resultDiv.setAttribute('role', 'alert');

                    const iconClass = ppm === Infinity || ppm > group.ppmTarget ? 'fas fa-exclamation-triangle text-danger me-2' : 'fas fa-check-circle text-success me-2';

                    resultDiv.innerHTML = `
                        <div>
                            <i class="${iconClass}"></i>
                            <strong class="me-1">${group.item} รุ่น ${model} PPM:</strong>
                        </div>
                        <span class="badge ${ppm === Infinity || ppm > group.ppmTarget ? 'bg-danger' : 'bg-primary'} fs-6">
                            ${isFinite(ppm) ? ppm.toFixed(2) : 'สูงมาก'}
                        </span>
                    `;
                    resultsOutput.appendChild(resultDiv);
                }
            });

            if (hasValidInputInGroup && !hasErrorOccurred) {
                let overallPPM = 0;
                if (totalSale > 0) {
                    overallPPM = (totalClaim * 1000000) / totalSale;
                } else if (totalClaim > 0 && totalSale === 0) {
                    overallPPM = Infinity;
                }

                const overallResultsContainer = document.getElementById(group.overallResultsId);
                overallResultsContainer.innerHTML = `
                    <div class="mb-2">
                        <strong class="me-1">ยอดเคลมรวม:</strong>
                        <span class="badge bg-secondary fs-6">${totalClaim.toLocaleString()}</span>
                    </div>
                    <div class="mb-2">
                        <strong class="me-1">ยอดขายรวม:</strong>
                        <span class="badge bg-secondary fs-6">${totalSale.toLocaleString()}</span>
                    </div>
                    <div class="mb-2">
                        <strong class="me-1">PPM รวม TH ${group.item}:</strong>
                        <span class="badge ${overallPPM === Infinity || overallPPM > group.ppmTarget ? 'bg-danger' : 'bg-primary'} fs-6">
                            ${isFinite(overallPPM) ? overallPPM.toFixed(2) : 'สูงมาก'}
                        </span>
                    </div>
                `;
                latestCalculatedResults.overall[group.id] = {
                    totalClaim: totalClaim,
                    totalSale: totalSale,
                    overallPPM: isFinite(overallPPM) ? parseFloat(overallPPM.toFixed(2)) : 'Infinity'
                };
            }
        });

        if (hasErrorOccurred) {
            toastBootstrap.show(); // แสดง Toast เมื่อมีข้อผิดพลาด
            resultsOutput.innerHTML = '<p class="text-danger text-center py-3">มีข้อผิดพลาดในการกรอกข้อมูล กรุณาแก้ไข.</p>';
        } else if (!hasAnyValidInputOverall) {
            const noDataMessage = document.createElement('p');
            noDataMessage.classList.add('text-muted', 'text-center', 'py-3');
            noDataMessage.textContent = 'กรุณากรอกข้อมูลยอดเคลมหรือยอดขายอย่างน้อยหนึ่งรุ่นในกลุ่มใดๆ เพื่อคำนวณ.';
            resultsOutput.appendChild(noDataMessage);
        }
    }

    // --- ฟังก์ชันบันทึกข้อมูล ---
    function saveCurrentData() {
        const currentData = getCurrentInputData();
        const timestamp = new Date();
        const formattedTimestamp = timestamp.toLocaleString('th-TH', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        const savedEntry = {
            timestamp: timestamp.toISOString(), // ISO string for sorting
            displayTimestamp: formattedTimestamp,
            inputData: currentData,
            calculatedResults: latestCalculatedResults // Store calculated results too
        };

        let history = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
        history.unshift(savedEntry); // Add to the beginning for most recent first
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history));

        successToastBody.textContent = 'บันทึกข้อมูลเรียบร้อยแล้ว!';
        successToastBootstrap.show();
        displayHistory(); // Refresh history list in modal
    }

    // --- ฟังก์ชันแสดงข้อมูลย้อนหลังใน Model ---
    function displayHistory() {
        historyList.innerHTML = '';
        let history = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');

        if (history.length === 0) {
            historyList.innerHTML = '<p class="text-muted text-center py-3">ไม่มีข้อมูลที่บันทึกไว้</p>';
            return;
        }

        history.forEach((entry, index) => {
            const historyItem = document.createElement('div');
            historyItem.classList.add('d-flex', 'justify-content-between', 'align-items-center', 'alert', 'alert-light', 'mb-2');
            historyItem.innerHTML = `
                <span>
                    <i class="fas fa-calendar-alt me-2"></i><strong>${entry.displayTimestamp}</strong>
                </span>
                <div>
                    <button class="btn btn-sm btn-primary load-history-btn me-2" data-index="${index}">
                        <i class="fas fa-eye"></i> โหลด
                    </button>
                    <button class="btn btn-sm btn-danger delete-history-btn" data-index="${index}">
                        <i class="fas fa-trash"></i> ลบ
                    </button>
                </div>
            `;
            historyList.appendChild(historyItem);
        });

        // Add event listeners for Load and Delete buttons
        document.querySelectorAll('.load-history-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const index = event.target.dataset.index;
                loadSelectedHistory(index);
            });
        });

        document.querySelectorAll('.delete-history-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const index = event.target.dataset.index;
                deleteHistoryEntry(index);
            });
        });
    }

    // --- ฟังก์ชันโหลดข้อมูลย้อนหลังที่เลือก ---
    function loadSelectedHistory(index) {
        let history = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
        if (index >= 0 && index < history.length) {
            const selectedEntry = history[index];
            setInputData(selectedEntry.inputData); // Populate inputs
            latestCalculatedResults = selectedEntry.calculatedResults; // Restore calculated results
            // Manually re-display results based on loaded data
            displayCalculatedResultsFromLoadedData(latestCalculatedResults);
            bootstrap.Modal.getInstance(document.getElementById('historyModal')).hide(); // Close modal
            successToastBody.textContent = 'โหลดข้อมูลย้อนหลังเรียบร้อยแล้ว!';
            successToastBootstrap.show();
        }
    }

    // --- ฟังก์ชันแสดงผลลัพธ์จากการโหลดข้อมูล (เนื่องจาก calculatePPM ล้างผลลัพธ์) ---
    function displayCalculatedResultsFromLoadedData(results) {
        resultsOutput.innerHTML = ''; // Clear previous individual results
        document.getElementById('overallBarrelResults').innerHTML = '';
        document.getElementById('overallLowerResults').innerHTML = '';

        let hasAnyResults = false;

        customerGroups.forEach(group => {
            // Display individual model results
            if (results.individual[group.id]) {
                Object.keys(results.individual[group.id]).forEach(model => {
                    const modelResult = results.individual[group.id][model];
                    if (modelResult.claim !== '' || modelResult.sale !== '') { // Only display if there was input
                        hasAnyResults = true;
                        const ppm = modelResult.ppm;
                        const resultDiv = document.createElement('div');
                        resultDiv.classList.add('alert', ppm === 'Infinity' || ppm > group.ppmTarget ? 'alert-danger' : 'alert-success', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-2');
                        resultDiv.setAttribute('role', 'alert');

                        const iconClass = ppm === 'Infinity' || ppm > group.ppmTarget ? 'fas fa-exclamation-triangle text-danger me-2' : 'fas fa-check-circle text-success me-2';

                        resultDiv.innerHTML = `
                            <div>
                                <i class="${iconClass}"></i>
                                <strong class="me-1">${group.item} รุ่น ${model} PPM:</strong>
                            </div>
                            <span class="badge ${ppm === 'Infinity' || ppm > group.ppmTarget ? 'bg-danger' : 'bg-primary'} fs-6">
                                ${ppm === 'Infinity' ? 'สูงมาก' : ppm.toFixed(2)}
                            </span>
                        `;
                        resultsOutput.appendChild(resultDiv);
                    }
                });
            }

            // Display overall results
            if (results.overall[group.id]) {
                hasAnyResults = true;
                const overall = results.overall[group.id];
                const overallResultsContainer = document.getElementById(group.overallResultsId);
                overallResultsContainer.innerHTML = `
                    <div class="mb-2">
                        <strong class="me-1">ยอดเคลมรวม:</strong>
                        <span class="badge bg-secondary fs-6">${overall.totalClaim.toLocaleString()}</span>
                    </div>
                    <div class="mb-2">
                        <strong class="me-1">ยอดขายรวม:</strong>
                        <span class="badge bg-secondary fs-6">${overall.totalSale.toLocaleString()}</span>
                    </div>
                    <div class="mb-2">
                        <strong class="me-1">PPM รวม TH ${group.item}:</strong>
                        <span class="badge ${overall.overallPPM === 'Infinity' || overall.overallPPM > group.ppmTarget ? 'bg-danger' : 'bg-primary'} fs-6">
                            ${overall.overallPPM === 'Infinity' ? 'สูงมาก' : overall.overallPPM.toFixed(2)}
                        </span>
                    </div>
                `;
            } else {
                 document.getElementById(group.overallResultsId).innerHTML = `<p class="text-muted text-center py-3">ยังไม่มีข้อมูลสำหรับ TH ${group.item}.</p>`;
            }
        });

        if (!hasAnyResults) {
            resultsOutput.innerHTML = '<p class="text-muted text-center py-3">ยังไม่มีข้อมูลสำหรับการคำนวณ โปรดกรอกข้อมูลแล้วกดคำนวณ.</p>';
        }
    }


    // --- ฟังก์ชันลบข้อมูลย้อนหลังที่เลือก ---
    function deleteHistoryEntry(index) {
        let history = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
        if (index >= 0 && index < history.length) {
            history.splice(index, 1); // Remove 1 element at the given index
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history));
            successToastBody.textContent = 'ลบข้อมูลเรียบร้อยแล้ว!';
            successToastBootstrap.show();
            displayHistory(); // Refresh history list
        }
    }

    // --- ฟังก์ชันลบข้อมูลย้อนหลังทั้งหมด ---
    function clearAllHistory() {
        if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลย้อนหลังทั้งหมด?')) {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            successToastBody.textContent = 'ลบข้อมูลย้อนหลังทั้งหมดเรียบร้อยแล้ว!';
            successToastBootstrap.show();
            displayHistory(); // Refresh history list
        }
    }

   

    // --- ฟังก์ชัน Export to Excel ---
    function exportToExcel() {
        console.log('--- Starting exportToExcel function ---');

        // Ensure latest results are calculated before export
        calculatePPM(); // This will update latestCalculatedResults
        console.log('latestCalculatedResults after calculatePPM:', JSON.parse(JSON.stringify(latestCalculatedResults))); // Deep copy to prevent mutation issues in console

        if (!latestCalculatedResults || (!Object.keys(latestCalculatedResults.individual).length && !Object.keys(latestCalculatedResults.overall).length)) {
             successToastBody.textContent = 'ไม่มีข้อมูลสำหรับ Export!';
             successToastBootstrap.show();
             console.warn('No data available for export.');
             return;
        }

        const datas = [];

        // Sheet 1: Individual PPM Results
        const individualPPMData = [];
        individualPPMData.push(['Item', 'Model', 'Claim', 'Sale', 'PPM']);
        customerGroups.forEach(group => {
            if (latestCalculatedResults.individual[group.id]) {
                Object.keys(latestCalculatedResults.individual[group.id]).forEach(model => {
                    const result = latestCalculatedResults.individual[group.id][model];
                    // Only include if there was input (claim or sale was not empty string)
                    if (result.claim !== '' || result.sale !== '') {
                         individualPPMData.push([
                            group.item,
                            model,
                            result.claim,
                            result.sale,
                            result.ppm === 'Infinity' ? 'สูงมาก' : result.ppm
                        ]);
                    }
                });
            }
        });

        console.log('individualPPMData (Sheet 1):', individualPPMData);
        if (individualPPMData.length > 1) { // Check if there's actual data beyond headers
            datas.push({
                sheetData: individualPPMData,
                sheetName: 'PPM รายรุ่น',
                sheetHeader: individualPPMData[0],
                columnWidths: [15, 15, 15, 15, 15],
            });
            console.log('Sheet 1 added to datas array.');
        } else {
            console.warn('No data for Sheet 1 (Individual PPM Results).');
        }


        // Sheet 2: Overall PPM Results
        const overallPPMData = [];
        overallPPMData.push(['Item', 'Total Claim', 'Total Sale', 'Overall PPM']);
        customerGroups.forEach(group => {
            if (latestCalculatedResults.overall[group.id]) {
                const overall = latestCalculatedResults.overall[group.id];
                overallPPMData.push([
                    group.item,
                    overall.totalClaim,
                    overall.totalSale,
                    overall.overallPPM === 'Infinity' ? 'สูงมาก' : overall.overallPPM
                ]);
            }
        });

        console.log('overallPPMData (Sheet 2):', overallPPMData);
        if (overallPPMData.length > 1) {
             datas.push({
                sheetData: overallPPMData,
                sheetName: 'PPM สรุป',
                sheetHeader: overallPPMData[0],
                columnWidths: [15, 20, 20, 20],
            });
            console.log('Sheet 2 added to datas array.');
        } else {
            console.warn('No data for Sheet 2 (Overall PPM Results).');
        }

        console.log('Final datas array for ExportJsonExcel:', datas);
        if (datas.length === 0) {
            successToastBody.textContent = 'ไม่มีข้อมูลเพียงพอสำหรับ Export!';
            successToastBootstrap.show();
            console.warn('No sheets generated for export.');
            return;
        }

        try {
            const option = {};
            option.fileName = `Claim_PPM_Report_${new Date().toISOString().slice(0, 10)}`;
            option.datas = datas;
            console.log('Export options:', option);

            const toExcel = new ExportJsonExcel(option);
            toExcel.saveExcel();
            console.log('ExportJsonExcel.saveExcel() called successfully.');
            successToastBody.textContent = 'ส่งออกข้อมูลเป็น Excel เรียบร้อยแล้ว!';
            successToastBootstrap.show();
        } catch (e) {
            console.error('Error during Excel export:', e);
            successToastBody.textContent = 'เกิดข้อผิดพลาดในการส่งออก Excel!';
            successToastBootstrap.show();
        }
    }


    // --- Event Listeners ---
    calculateBtn.addEventListener('click', calculatePPM);
    saveDataBtn.addEventListener('click', saveCurrentData);
    loadHistoryBtn.addEventListener('click', displayHistory); // Call displayHistory when modal is opened
    exportExcelBtn.addEventListener('click', exportToExcel);
    clearAllHistoryBtn.addEventListener('click', clearAllHistory);

    // Initial calculation and display of results (if any data is pre-filled, though usually empty on first load)
    calculatePPM(); // To set initial state of result sections and ensure latestCalculatedResults is populated if inputs have default values
});