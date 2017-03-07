/**
 * AUTHOR: Jansi Thiyagarajan
 * DESCRIPTION: handles input file uploaded by the user
 */






window.onload = function () {


    var file = document.getElementById("file");

    file.addEventListener('change', function () {

        var fileInput = file.files[0];

        if (window.FileReader) {

            var reader = new FileReader();


            reader.onload = function (e) {

                console.log(reader.result);
                getData(reader.result);
            };



            reader.onerror = function (evt) {

                switch (evt.target.error.code) {
                    case evt.target.error.NOT_FOUND_ERR:
                        alert('File Not Found!');
                        break;
                    case evt.target.error.NOT_READABLE_ERR:
                        alert('File is not readable');
                        break;
                    case evt.target.error.ABORT_ERR:
                        break;
                    default:
                        alert('An error occurred reading this file.');
                }
            };

            reader.readAsText(fileInput);


        }

        else {

            document.getElementById('visual').innerHTML = '<div class="alert alert-danger"> File Reader not supported in your browser. Please try modern browsers like chrome, firefox, IE9.... </div>';


        }
    });

};




