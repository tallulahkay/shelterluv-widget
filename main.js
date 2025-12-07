let currentPage = 0;
const itemsPerPage = 12;
let animalData = [];
let allAnimals = [];
let ageOptions = [];
let sexOptions = [];
let attributeOptions = [];
let breedOptions = [];
let sizeOptions = [];

// Helper function to normalize photos to array format
const normalizePhotos = (photos) => {
    if (Array.isArray(photos)) {
        return photos;
    } else if (photos && typeof photos === 'object') {
        // Convert object to array
        return Object.values(photos);
    }
    return [];
}

const getAnimals = async () => {
    try {
        const response = await fetch('https://new.shelterluv.com/api/v3/available-animals/24538?animalType=Dog');

        const data = await response.json();
        animalData = data.animals;
        allAnimals = data.animals;

        console.log('Full API Response:', data);
        console.log('Total Animals:', allAnimals.length);

        populateFilterOptions();

        const templateResponse = await fetch('template.hbs');
        const source = await templateResponse.text();

        const template = Handlebars.compile(source);
        const templateData = {
            allAnimals,
            ageOptions,
            sexOptions,
            attributeOptions,
            breedOptions,
            sizeOptions
        };
        const html = template(templateData);
        document.getElementById("output").innerHTML = html;

        new SlimSelect({
            select: '#sex'
        });
        new SlimSelect({
            select: '#age'
        });
        new SlimSelect({
            select: '#attributes',
            settings: {
                allowDeselect: true,
                closeOnSelect: false
            }
        });
        new SlimSelect({
            select: '#breed'
        });
        new SlimSelect({
            select: '#size'
        });

        displayAnimals();
        updatePagination();

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('output').innerHTML = '<p>Error loading animals</p>';
    }
}

const displayAnimals = () => {
    const container = document.getElementById('animals');
    const start = currentPage * itemsPerPage;
    const end = start + itemsPerPage;
    let pageAnimals = allAnimals.slice(start, end);

    container.innerHTML = pageAnimals.map(animal => {
        // Normalize photos to array
        const photosArray = normalizePhotos(animal.photos);

        // Find the cover photo
        const coverPhoto = photosArray.find(p => p.isCover) || photosArray[0];
        const imageUrl = coverPhoto ? coverPhoto.url : '';

        return `
          <div class="animal-card" onclick="openAnimalDetail('${animal.public_url}', ${animal.nid})">
            ${imageUrl ? `<img src="${imageUrl}" alt="${animal.name}">` : ''}
            <h3>${animal.name}</h3>
          </div>
        `;
    }).join('');

    // Scroll container to top when new page loads
    container.scrollTop = 0;
}

const openAnimalDetail = (publicUrl, nid) => {
    // Find the animal in our data for logging
    const animal = allAnimals.find(a => a.nid === nid);

    if (animal) {
        // Log the full animal details
        console.log('Full Animal Details:', animal);
        console.log('Animal Name:', animal.name);
        console.log('Animal NID:', animal.nid);
        console.log('Unique ID:', animal.uniqueId);
        console.log('Public URL:', publicUrl);
    }

    // Open the embed page in a new tab
    window.open(publicUrl, '_blank');
}

const updatePagination = () => {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');

    const totalPages = Math.ceil(allAnimals.length / itemsPerPage);
    const start = currentPage * itemsPerPage + 1;
    const end = Math.min((currentPage + 1) * itemsPerPage, allAnimals.length);

    // Disable previous button if on first page
    prevBtn.disabled = currentPage === 0;

    // Disable next button if on last page
    nextBtn.disabled = currentPage >= totalPages - 1;

    // Update page info
    pageInfo.textContent = `Showing ${start}-${end} of ${allAnimals.length} animals (Page ${currentPage + 1} of ${totalPages})`;
}

const nextPage = () => {
    const totalPages = Math.ceil(allAnimals.length / itemsPerPage);
    if (currentPage < totalPages - 1) {
        currentPage++;
        displayAnimals();
        updatePagination();
    }
}

const prevPage = () => {
    if (currentPage > 0) {
        currentPage--;
        displayAnimals();
        updatePagination();
    }
}

const populateFilterOptions = () => {
    for (animal of allAnimals) {
        if (!ageOptions.includes(animal.age_group.name)) {
            ageOptions.push(animal.age_group.name);
        }
        if (!sexOptions.includes(animal.sex)) {
            sexOptions.push(animal.sex);
        }
        for (attribute of animal.attributes) {
            if (!attributeOptions.includes(attribute)) {
                attributeOptions.push(attribute);
            }
        }
        if (!breedOptions.includes(animal.breed)) {
            breedOptions.push(animal.breed);
        }
        if (!sizeOptions.includes(animal.weight_group)) {
            sizeOptions.push(animal.weight_group);
        }
    }
}

// Load animals on initial load
getAnimals();

document.addEventListener('change', (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(opt => opt.value);
    if (selectedOptions.length === 0) {
        resetAnimals();
    } else {
        filterAnimals();
    }
})

const filterAnimals = () => {
    const selectedAttributes = Array.from(document.getElementById('attributes').selectedOptions)
        .map(opt => opt.value);
    const selectedSex = Array.from(document.getElementById('sex').selectedOptions)
        .map(opt => opt.value);
    const selectedAge = Array.from(document.getElementById('age').selectedOptions)
        .map(opt => opt.value);
    const selectedBreed = Array.from(document.getElementById('breed').selectedOptions)
        .map(opt => opt.value);
    const selectedSize = Array.from(document.getElementById('size').selectedOptions)
        .map(opt => opt.value);

    const currentFilters = {
        sex: selectedSex,
        age: selectedAge,
        breed: selectedBreed,
        size: selectedSize,
        attributes: selectedAttributes
    };

    allAnimals = animalData
        .filter((animal) => {
            if (currentFilters.sex.length > 0) {
                return currentFilters.sex.includes(animal.sex);
            } else return true
        })
        .filter((animal) => {
            if (currentFilters.age.length > 0) {
                return currentFilters.age.includes(animal.age_group.name)
            } else return true
        })
        .filter((animal) => {
            if (currentFilters.breed.length > 0) {
                return currentFilters.breed.includes(animal.breed)
            } else return true
        })
        .filter((animal) => {
            if (currentFilters.size.length > 0) {
                return currentFilters.size.includes(animal.weight_group)
            } else return true
        })
        .filter((animal) => {
            if (currentFilters.attributes.length > 0) {
                return currentFilters.attributes.every(selectedAttr =>
                    animal.attributes.includes(selectedAttr)
                );
            } else return true
        })

    currentPage = 0;
    displayAnimals()
    updatePagination();
}

const resetAnimals = () => {
    allAnimals = animalData;
    displayAnimals();
}