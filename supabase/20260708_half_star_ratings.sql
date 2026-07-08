alter table public.user_movies
  drop constraint if exists user_movies_rating_check;

alter table public.user_movies
  alter column rating type numeric(2,1) using rating::numeric;

alter table public.user_movies
  add constraint user_movies_rating_check check (rating between 0 and 5 and rating * 2 = floor(rating * 2));

alter table public.reviews
  drop constraint if exists reviews_rating_check;

alter table public.reviews
  alter column rating type numeric(2,1) using rating::numeric;

alter table public.reviews
  add constraint reviews_rating_check check (rating between 0 and 5 and rating * 2 = floor(rating * 2));
