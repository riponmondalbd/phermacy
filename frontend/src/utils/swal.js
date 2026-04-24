import Swal from 'sweetalert2';

export const confirmDelete = async (title = 'Are you sure?', text = "You won't be able to revert this!") => {
  return Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#4f46e5', // Brand color
    cancelButtonColor: '#1a1d27',
    confirmButtonText: 'Yes, delete it!',
    background: '#1a1d27',
    color: '#e2e8f0',
    customClass: {
      popup: 'rounded-2xl border border-[#2a2f45]',
      confirmButton: 'rounded-lg px-4 py-2 font-semibold',
      cancelButton: 'rounded-lg px-4 py-2 font-semibold'
    }
  });
};

export const swalSuccess = (title, text) => {
  Swal.fire({
    title,
    text,
    icon: 'success',
    timer: 2000,
    showConfirmButton: false,
    background: '#1a1d27',
    color: '#e2e8f0'
  });
};

export const swalError = (title, text) => {
  Swal.fire({
    title,
    text,
    icon: 'error',
    background: '#1a1d27',
    color: '#e2e8f0'
  });
};
