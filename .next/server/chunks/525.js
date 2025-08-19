exports.id=525,exports.ids=[525],exports.modules={16391:(e,t,r)=>{"use strict";r.d(t,{HW:()=>n,ND:()=>i,Ru:()=>a});let i=(0,r(60463).UU)("https://zusheijhebsmjiyyeiqq.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1c2hlaWpoZWJzbWppeXllaXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MjI0NDAsImV4cCI6MjA2NzM5ODQ0MH0.iwGPaOJPa6OvwX_iA1xvRt5cM72DWfd8Br1pwRTemRc"),a=async(e,t)=>{let{data:r,error:a}=await i.auth.signInWithPassword({email:e,password:t});return{data:r,error:a}},n=async()=>{let{data:{user:e}}=await i.auth.getUser();return e}},39727:()=>{},46055:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>a});var i=r(31658);let a=async e=>[{type:"image/x-icon",sizes:"16x16",url:(0,i.fillMetadataSegment)(".",await e.params,"favicon.ico")+""}]},47990:()=>{},96446:(e,t,r)=>{"use strict";r.d(t,{QE:()=>a,uE:()=>m,bG:()=>d,DW:()=>c});var i=r(16391);async function a(){let e=new Date,t=e.getFullYear().toString().slice(-2),r=(e.getMonth()+1).toString().padStart(2,"0");try{let e="",a=!1,n=0;for(;!a&&n<1e3;){let o=Math.floor(1e4*Math.random()).toString().padStart(4,"0");e=`AH${t}${r}${o}`;let{data:s,error:l}=await i.ND.from("patients").select("patient_id").eq("patient_id",e).single();if(l&&"PGRST116"===l.code)a=!0;else if(l)throw console.error("Error checking UHID uniqueness:",l),Error("Failed to generate UHID");n++}if(!a)throw Error("Failed to generate unique UHID after maximum attempts");return e}catch(e){throw console.error("Error generating UHID:",e),Error("Failed to generate UHID")}}async function n(e){let t=`${e}@annam.com`,r="password";try{let{data:a,error:n}=await i.ND.auth.signUp({email:t,password:r,options:{emailRedirectTo:`${window.location.origin}/auth/callback`,data:{role:"patient",uhid:e,email_confirm:!0}}});if(n)throw console.error("Error creating auth user:",n),Error(`Failed to create authentication: ${n.message}`);return{authUser:a.user,credentials:{email:t,password:r}}}catch(e){throw console.error("Error creating patient auth credentials:",e),e}}async function o(e,t,r){try{let a=`${t.firstName} ${t.lastName}`,n=function(e){let t=new Date,r=t.getFullYear().toString(),i=(t.getMonth()+1).toString().padStart(2,"0"),a=t.getTime().toString().slice(-4);return`BARS${r}${i}${a}`}(0),o=null;t.admissionDate&&(o=t.admissionTime?`${t.admissionDate}T${t.admissionTime}`:`${t.admissionDate}T00:00:00`);let s={patient_id:e,barcode_id:n,name:a,date_of_birth:t.dateOfBirth,gender:t.gender.toLowerCase(),marital_status:t.maritalStatus||null,phone:t.phone,email:t.email||`${e}@annam.com`,address:t.address,blood_group:t.bloodGroup||null,allergies:t.allergies||null,medical_history:t.medicalHistory||null,current_medications:t.currentMedications||null,chronic_conditions:t.chronicConditions||null,previous_surgeries:t.previousSurgeries||null,admission_date:o,admission_time:t.admissionTime||null,primary_complaint:t.primaryComplaint,admission_type:t.admissionType,referring_doctor_facility:t.referringDoctorFacility||null,department_ward:t.departmentWard||null,room_number:t.roomNumber||null,guardian_name:t.guardianName||null,guardian_relationship:t.guardianRelationship||null,guardian_phone:t.guardianPhone||null,guardian_address:t.guardianAddress||null,emergency_contact_name:t.emergencyContactName||null,emergency_contact_phone:t.emergencyContactPhone||null,emergency_contact_relationship:t.emergencyContactRelationship||null,insurance_number:t.insuranceNumber||null,insurance_provider:t.insuranceProvider||null,initial_symptoms:t.initialSymptoms||null,referred_by:t.referredBy||null,user_id:r||null,status:"active"},{data:l,error:c}=await i.ND.from("patients").insert([s]).select().single();if(c)throw console.error("Error inserting patient record:",c),Error(`Failed to create patient record: ${c.message}`);return l}catch(e){throw console.error("Error inserting patient record:",e),e}}async function s(e,t,r){try{let a=`${r.firstName} ${r.lastName}`,n={auth_id:e,employee_id:t,name:a,email:r.email||`${t}@annam.com`,role:"patient",phone:r.phone,address:r.address,status:"active",permissions:{patient_portal:!0,view_own_records:!0,book_appointments:!0}},{data:o,error:s}=await i.ND.from("users").insert([n]).select().single();if(s)throw console.error("Error linking auth user to patient:",s),Error(`Failed to create user record: ${s.message}`);return o}catch(e){throw console.error("Error linking auth user to patient:",e),e}}async function l(e,t){try{if(!t.initialSymptoms?.trim()&&!t.primaryComplaint?.trim())return null;let r=`APT${Date.now()}`,a=new Date;a.setDate(a.getDate()+1);let n={appointment_id:r,patient_id:e,appointment_date:a.toISOString().split("T")[0],appointment_time:"09:00:00",type:"consultation",status:"scheduled",symptoms:t.initialSymptoms||t.primaryComplaint,notes:`Initial consultation for newly registered patient. Primary complaint: ${t.primaryComplaint}`},{data:o,error:s}=await i.ND.from("appointments").insert([n]).select().single();if(s)return console.error("Error creating initial appointment:",s),null;return o}catch(e){return console.error("Error creating initial appointment:",e),null}}async function c(e,t){try{let r=t||await a();console.log("Using UHID:",r);let{authUser:i,credentials:c}=await n(r);console.log("Created auth user:",i?.id);let d=await s(i.id,r,e);console.log("Created user record:",d.id);let m=await o(r,e,d.id);if(console.log("Created patient record:",m.id),e.initialSymptoms?.trim()||e.primaryComplaint?.trim()){let t=await l(m.id,e);t&&console.log("Created initial appointment:",t.id)}return{success:!0,patient:m,uhid:r,credentials:c}}catch(e){return console.error("Error registering new patient:",e),{success:!1,error:e instanceof Error?e.message:"Unknown error occurred"}}}async function d(e){try{let{data:t,error:r}=await i.ND.from("patients").select(`
        *,
        users:user_id (
          id,
          name,
          email,
          role,
          status,
          permissions
        ),
        appointments:appointments(
          id,
          appointment_id,
          appointment_date,
          appointment_time,
          type,
          status,
          symptoms,
          diagnosis,
          doctor:doctors(
            id,
            user:users(name, specialization)
          )
        ),
        bed_allocations:bed_allocations(
          id,
          admission_date,
          discharge_date,
          admission_type,
          status,
          bed:beds(bed_number, room_number, bed_type),
          doctor:doctors(
            id,
            user:users(name, specialization)
          )
        )
      `).eq("patient_id",e).single();if(r)throw console.error("Error fetching patient with related data:",r),Error(`Patient not found: ${r.message}`);return t}catch(e){throw console.error("Error fetching patient with related data:",e),e}}async function m(e={}){try{let{page:t=1,limit:r=20,status:a,searchTerm:n}=e,o=(t-1)*r,s=i.ND.from("patients").select(`
        *,
        users:user_id (
          id,
          name,
          email,
          role,
          status,
          permissions
        )
      `,{count:"exact"});a&&(s=s.eq("status",a)),n&&(s=s.or(`name.ilike.%${n}%,patient_id.ilike.%${n}%,phone.ilike.%${n}%`));let{data:l,error:c,count:d}=await s.range(o,o+r-1).order("created_at",{ascending:!1});if(c)throw console.error("Error fetching patients:",c),Error(`Failed to fetch patients: ${c.message}`);return{patients:l||[],total:d||0,page:t,limit:r}}catch(e){throw console.error("Error fetching patients:",e),e}}}};