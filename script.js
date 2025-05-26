document.addEventListener('DOMContentLoaded', () => {
    // --- กำหนดข้อมูลสำหรับแต่ละกลุ่มลูกค้า/Item ---
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
    const resultsOutput = document.getElementById('resultsOutput');
    const liveToast = document.getElementById('liveToast');
    const toastBootstrap = bootstrap.Toast.getOrCreateInstance(liveToast); // Initialize Bootstrap Toast

    // --- ฟังก์ชันสำหรับสร้างช่องกรอกข้อมูล ---
    function createInputFields(group) {
        const container = document.getElementById(group.containerId); // ใช้ getElementById
        group.models.forEach(model => {
            const entryDiv = document.createElement('div');
            entryDiv.classList.add('col-md-6', 'col-lg-4'); // Bootstrap grid classes
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

    // --- ฟังก์ชันสำหรับคำนวณและแสดงผล ---
    function processCustomerGroup(group) {
        let totalClaim = 0;
        let totalSale = 0;
        let hasValidInputInGroup = false;
        let hasErrorInGroup = false;

        // Clear previous results for this group in overall section
        const overallResultsContainer = document.getElementById(group.overallResultsId);
        overallResultsContainer.innerHTML = '';

        group.models.forEach(model => {
            const claimInput = document.getElementById(`${group.id}-${model}-claim`);
            const saleInput = document.getElementById(`${group.id}-${model}-sale`);

            // Reset validation states
            claimInput.classList.remove('is-invalid', 'is-valid');
            saleInput.classList.remove('is-invalid', 'is-valid');

            const claimValue = claimInput.value.trim();
            const saleValue = saleInput.value.trim();

            let claim = 0;
            let sale = 0;
            let isValidForThisModel = true;

            // ตรวจสอบข้อมูลเคลม
            if (claimValue !== '') {
                claim = parseFloat(claimValue);
                if (isNaN(claim) || claim < 0) {
                    isValidForThisModel = false;
                    claimInput.classList.add('is-invalid');
                } else {
                    claimInput.classList.add('is-valid');
                }
            }

            // ตรวจสอบข้อมูลขาย
            if (saleValue !== '') {
                sale = parseFloat(saleValue);
                if (isNaN(sale) || sale < 0) {
                    isValidForThisModel = false;
                    saleInput.classList.add('is-invalid');
                } else {
                    saleInput.classList.add('is-valid');
                }
            }

            if (!isValidForThisModel) {
                hasErrorInGroup = true;
                return; // ข้ามการคำนวณ PPM และการแสดงผลสำหรับรุ่นนี้หากมีข้อผิดพลาด
            }

            if (claimValue !== '' || saleValue !== '') {
                totalClaim += claim;
                totalSale += sale;
                hasValidInputInGroup = true;
            }

            let ppm = 0;
            if (sale > 0) {
                ppm = (claim * 1000000) / sale;
            } else if (claim > 0 && sale === 0) {
                ppm = Infinity;
            }

            // แสดงผลลัพธ์รายรุ่นเฉพาะรุ่นที่มีข้อมูลกรอก
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

        if (hasErrorInGroup) {
            toastBootstrap.show(); // แสดง Toast เมื่อมีข้อผิดพลาด
        }

        if (hasValidInputInGroup && !hasErrorInGroup) {
            let overallPPM = 0;
            if (totalSale > 0) {
                overallPPM = (totalClaim * 1000000) / totalSale;
            } else if (totalClaim > 0 && totalSale === 0) {
                overallPPM = Infinity;
            }

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
        } else if (!hasValidInputInGroup && !hasErrorInGroup) {
             const noDataMessage = document.createElement('p');
            noDataMessage.classList.add('text-muted', 'text-center', 'py-3');
            noDataMessage.textContent = `กรุณากรอกข้อมูลยอดเคลมหรือยอดขายสำหรับ TH ${group.item} อย่างน้อยหนึ่งรุ่นเพื่อคำนวณ.`;
            overallResultsContainer.appendChild(noDataMessage);
        }
    }

    // --- Event Listener สำหรับปุ่มคำนวณ ---
    calculateBtn.addEventListener('click', () => {
        resultsOutput.innerHTML = ''; // ล้างผลลัพธ์รายรุ่นทั้งหมด

        let hasAnyValidInputOverall = false;

        customerGroups.forEach(group => {
            processCustomerGroup(group);

            // Check if the overall results container for this group has valid output (not just a message)
            const overallContainer = document.getElementById(group.overallResultsId);
            if (overallContainer.children.length > 0 && !overallContainer.querySelector('.text-muted')) {
                hasAnyValidInputOverall = true;
            }
        });

        // Display a general message if no data was entered across all groups
        if (!hasAnyValidInputOverall && resultsOutput.children.length === 0) {
            const noDataMessage = document.createElement('p');
            noDataMessage.classList.add('text-muted', 'text-center', 'py-3');
            noDataMessage.textContent = 'กรุณากรอกข้อมูลยอดเคลมหรือยอดขายอย่างน้อยหนึ่งรุ่นในกลุ่มใดๆ เพื่อคำนวณ.';
            resultsOutput.appendChild(noDataMessage);
        }
    });
});