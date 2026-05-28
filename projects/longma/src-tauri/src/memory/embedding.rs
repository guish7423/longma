use fastembed::{EmbeddingModel, TextEmbedding, TextInitOptions};
use std::sync::Mutex;
use std::sync::OnceLock;

static EMBEDDER: OnceLock<Mutex<TextEmbedding>> = OnceLock::new();

fn get_embedder() -> Option<&'static Mutex<TextEmbedding>> {
    EMBEDDER.get_or_init(|| {
        match TextEmbedding::try_new(
            TextInitOptions::new(EmbeddingModel::AllMiniLML6V2)
                .with_show_download_progress(true),
        ) {
            Ok(model) => Mutex::new(model),
            Err(e) => {
                eprintln!("Failed to init embedding model: {e}");
                panic!("Embedding model init failed: {e}");
            }
        }
    });
    EMBEDDER.get()
}

#[allow(dead_code)]
pub fn is_available() -> bool {
    get_embedder().is_some()
}

pub fn generate(text: &str) -> Option<Vec<f32>> {
    let mut embedder = get_embedder()?.lock().ok()?;
    let text_clean = text.replace('\n', " ").trim().to_string();
    if text_clean.is_empty() {
        return None;
    }
    match embedder.embed(vec![text_clean], None) {
        Ok(mut embeddings) => embeddings.pop(),
        Err(e) => {
            eprintln!("Embedding error: {e}");
            None
        }
    }
}

pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }
    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }
    (dot / (norm_a * norm_b)).clamp(-1.0, 1.0)
}

pub fn vec_to_blob(vec: &[f32]) -> Vec<u8> {
    vec.iter()
        .flat_map(|f| f.to_le_bytes())
        .collect()
}

pub fn blob_to_vec(blob: &[u8]) -> Option<Vec<f32>> {
    if blob.len() % 4 != 0 {
        return None;
    }
    blob.chunks(4)
        .map(|chunk| Some(f32::from_le_bytes(chunk.try_into().ok()?)))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cosine_similarity_identical() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![1.0, 0.0, 0.0];
        let sim = cosine_similarity(&a, &b);
        assert!((sim - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_cosine_similarity_orthogonal() {
        let a = vec![1.0, 0.0];
        let b = vec![0.0, 1.0];
        let sim = cosine_similarity(&a, &b);
        assert!((sim - 0.0).abs() < 0.001);
    }

    #[test]
    fn test_cosine_similarity_opposite() {
        let a = vec![1.0, 2.0];
        let b = vec![-1.0, -2.0];
        let sim = cosine_similarity(&a, &b);
        assert!((sim - (-1.0)).abs() < 0.001);
    }

    #[test]
    fn test_cosine_similarity_empty() {
        assert_eq!(cosine_similarity(&[], &[]), 0.0);
    }

    #[test]
    fn test_cosine_similarity_zero_vector() {
        let a = vec![0.0, 0.0];
        let b = vec![1.0, 2.0];
        assert_eq!(cosine_similarity(&a, &b), 0.0);
    }

    #[test]
    fn test_vec_to_blob_roundtrip() {
        let original = vec![1.5, -2.5, 0.0, 3.14];
        let blob = vec_to_blob(&original);
        assert_eq!(blob.len(), original.len() * 4);
        let recovered = blob_to_vec(&blob).unwrap();
        assert_eq!(original.len(), recovered.len());
        for (a, b) in original.iter().zip(recovered.iter()) {
            assert!((a - b).abs() < 0.001);
        }
    }

    #[test]
    fn test_blob_to_vec_invalid_length() {
        let blob = vec![0u8, 1u8, 2u8]; // 3 bytes, not divisible by 4
        assert!(blob_to_vec(&blob).is_none());
    }

    #[test]
    fn test_blob_to_vec_empty() {
        let blob: Vec<u8> = vec![];
        let result = blob_to_vec(&blob).unwrap();
        assert!(result.is_empty());
    }
}
